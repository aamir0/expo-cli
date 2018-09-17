import fs from 'fs';

import ProgressBar from 'progress';
import Axios from 'axios';
import _ from 'lodash';

import { BuildInformation, ProjectUtils } from 'xdl';
import * as UrlUtils from '../utils/url';
import prompt from '../../prompt';
import log from '../../log';

const OPTIONS = ['path', 'latest', 'id'];

export default class BaseUploader {
  constructor(projectDir, options) {
    this.projectDir = projectDir;
    this.options = options;
  }

  getPlatformName = () => {
    throw new Error('Not implemented');
  };

  getPlatformExtension = () => {
    throw new Error('NotImplemented');
  };

  getPlatform = () => {
    throw new Error('Not implemented');
  };

  ensureFileIsCorrect = file => {
    const regexp = new RegExp(`^.*\.${this.getPlatformExtension()}$`);
    if (!regexp.test(file)) {
      throw new Error(`File ${file} isn't ${this.getPlatformExtension()} file`);
    }
  };

  ensurePlatformOptionsAreCorrect = () => {
    throw new Error('Not implemented');
  };

  ensureConfigDataIsCorrect = configData => {
    throw new Error('Not implemented');
  };

  getPlatformData = () => {
    throw new Error('Not implemented');
  };

  uploadToStore = (data, configData, platformData, path) => {
    throw new Error('not implemented');
  };

  pathGetter = () => {
    return {
      path: this.options.path,
      platform: this.getPlatform(),
    };
  };

  idGetter = async () => {
    const { id } = this.options;
    const platform = this.getPlatform();
    const [build] = await BuildInformation.getBuildInformation({ id, platform }, this.projectDir);
    if (!build) {
      throw new Error(`There is no compiled build with id: ${id}`);
    }
    return {
      id,
      platform: build.platform,
      remoteUrl: build.artifacts.url,
    };
  };

  latestGetter = async () => {
    const platform = this.getPlatform();
    const [build] = await BuildInformation.getBuildInformation(
      { limit: 1, platform },
      this.projectDir
    );
    if (!build) {
      throw new Error(`There is no compiled builds for ${platform}`);
    }
    return {
      id: build.id,
      platform,
      remoteUrl: build.artifacts.url,
    };
  };

  chooseBuild = async () => {
    const listElement = build => {
      const platformPart = build.platform === 'ios' ? 'iOS' : 'Android';
      const message = `### ${platformPart} | ${UrlUtils.constructBuildLogsUrl(build.id)} ###`;

      return {
        name: message,
        value: build,
      };
    };
    const platform = this.getPlatform();
    const builds = await BuildInformation.getBuildInformation(
      { platform, limit: 10 },
      this.projectDir
    );
    if (!builds.length) {
      throw new Error(`There is no compiled builds for ${this.getPlatformName()}`);
    }
    const { build } = await prompt({
      name: 'build',
      message: 'Choose build to upload',
      type: 'list',
      choices: builds.map(listElement),
    });

    return {
      id: build.id,
      platform: build.platform,
      remoteUrl: build.artifacts.url,
    };
  };

  nothingGetter = async () => {
    const SOURCES_LIST = [
      {
        name: 'Latest build',
        value: 'latest',
      },
      {
        name: 'Other build',
        value: 'other',
      },
    ];
    const { source } = await prompt({
      name: 'source',
      message: 'Which build do you want to upload?',
      type: 'list',
      choices: SOURCES_LIST,
    });

    if (source === 'latest') return this.latestGetter();
    else return this.chooseBuild();
  };

  getSource = () => {
    const options = this.options;
    let getter;
    if (options.path) getter = this.pathGetter;
    else if (options.latest) getter = this.latestGetter;
    else if (options.id) getter = this.idGetter;
    else getter = this.nothingGetter;

    return {
      getData: getter,
    };
  };

  getConfigData = async () => {
    const { exp } = await ProjectUtils.readConfigJsonAsync(this.projectDir);
    const configName = await ProjectUtils.configFilenameAsync(this.projectDir);
    if (!exp) {
      throw new Error(`Couldn't read ${configName} file in project at ${this.projectDir}`);
    }

    return {
      name: exp.name,
      android: exp.android,
      ios: exp.ios,
      version: exp.version,
      debug: { configName },
    };
  };

  copyFile = async file => {
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} doesn't exist`);
    }
    const suffix = this.getPlatform() === 'ios' ? 'ipa' : 'apk';
    const dest = `./build.${suffix}`;
    await fs.copyFileSync(file, dest);
    return dest;
  };

  downloadFileFrom = async remoteUrl => {
    if (!/^http/.test(remoteUrl)) {
      return this.copyFile(remoteUrl);
    }
    const dest = _.last(remoteUrl.split('/'));
    if (fs.existsSync(dest)) {
      log.warn(
        `File ${dest} exists. If it's not ${this.getPlatformExtension()} you want to upload change its name`
      );
      return dest;
    }
    log(`Downloading build from ${remoteUrl}`);
    const response = await Axios({
      method: 'GET',
      url: remoteUrl,
      responseType: 'stream',
    });
    const totalLength = parseInt(response.headers['content-length'], 10);
    const bar = new ProgressBar('Downloading [:bar] :percent :etas', {
      complete: '=',
      incomplete: ' ',
      total: totalLength,
    });
    response.data.pipe(fs.createWriteStream(dest));
    return new Promise((resolve, reject) => {
      response.data.on('end', () => resolve(dest));
      response.data.on('data', data => bar.tick(data.length));
      response.data.on('error', error => reject(new Error(`${error}`)));
    });
  };

  upload = async () => {
    this.ensureOptionsAreCorrect();
    const source = this.getSource();
    const data = await source.getData();
    const { remoteUrl } = data;
    const configData = await this.getConfigData();
    this.ensureConfigDataIsCorrect(configData);
    const path = data.path ? data.path : await this.downloadFileFrom(remoteUrl);
    const platformData = await this.getPlatformData();
    await this.uploadToStore(configData, platformData, path);
  };

  ensureOptionsAreCorrect = () => {
    const options = this.options;
    let definedKeys = _.pick(options, OPTIONS);
    definedKeys = _.keys(definedKeys).filter(key => !_.isNil(options[key]));
    if (definedKeys.length > 1) {
      throw new Error(`You have to choose only one of --path, --id, --latest`);
    }
    if (options.path && !fs.existsSync(options.path)) {
      throw new Error(`File ${options.path} doesn't exist`);
    }
    if (options.path) {
      this.ensureFileIsCorrect(options.path);
    }
    this.ensurePlatformOptionsAreCorrect();
  };

  getFastlane = () => {
    return process.platform === 'darwin'
      ? require('@expo/traveling-fastlane-darwin')()
      : require('@expo/traveling-fastlane-linux')();
  };
}
