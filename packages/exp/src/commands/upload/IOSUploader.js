import prompt from '../../prompt';
import log from '../../log';

import BaseUploader from './BaseUploader';
import { printError, spawnAndCollectJSONOutputAsync } from './utils';

export default class IOSUploader extends BaseUploader {
  getPlatformName = () => {
    return 'iOS';
  };

  getPlatformExtension = () => {
    return 'ipa';
  };

  getPlatform = () => {
    return 'ios';
  };

  ensurePlatformOptionsAreCorrect = () => {};

  ensureConfigDataIsCorrect = configData => {
    const { configName } = configData.debug;
    const { ios } = configData;
    if (!ios || !ios.bundleIdentifier) {
      throw new Error(
        `Must specify a bundle identifier in order to upload ipa file.` +
          `Please specify one in ${this.projectDir}/${configName}`
      );
    }
  };

  getPlatformData = () => {
    if (!this.options.appleId) {
      log('You can specify your Apple ID using --apple-id option');
      return prompt({
        name: 'appleId',
        message: 'Your Apple ID Username: ',
        type: 'input',
      });
    }
    return { appleId: this.options.appleId };
  };

  uploadToStore = async ({ name: appName, ios: { bundleIdentifier } }, { appleId }, path) => {
    const fastlane = this.getFastlane();
    const login = await spawnAndCollectJSONOutputAsync(fastlane.app_produce, [
      bundleIdentifier,
      appName,
      appleId,
    ]);
    if (login.result !== 'success') {
      printError(login, 'login');
      return;
    }
    const upload = await spawnAndCollectJSONOutputAsync(fastlane.app_deliver, [path, appleId]);
    if (upload.result !== 'success') {
      printError(upload, 'upload');
    }
  };
}
