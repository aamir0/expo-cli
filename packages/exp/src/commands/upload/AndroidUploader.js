import prompt from '../../prompt';
import log from '../../log';

import BaseUploader from './BaseUploader';
import { printError, spawnAndCollectJSONOutputAsync } from './utils';

export default class AndroidUploader extends BaseUploader {
  getPlatformName = () => {
    return 'Android';
  };

  getPlatformExtension = () => {
    return 'apk';
  };

  getPlatform = () => {
    return 'android';
  };

  ensurePlatformOptionsAreCorrect = () => {};

  ensureConfigDataIsCorrect = configData => {
    const { configName } = configData.debug;
    const { android } = configData;
    if (!android || !android.package) {
      throw new Error(
        `Must specify a package in order to upload apk file.` +
          `Please specify one in ${this.projectDir}/${configName}`
      );
    }
  };

  getPlatformData = () => {
    if (!this.options.key) {
      log('You can specify json file ID using --key option');
      return prompt({
        name: 'key',
        message: 'The service account json file used to authenticate with Google Play Store:  ',
        type: 'input',
      });
    }
    return { key: this.options.key };
  };

  uploadToStore = async ({ android: { package: androidPackage } }, { key }, path) => {
    const fastlane = this.getFastlane();
    const supply = await spawnAndCollectJSONOutputAsync(fastlane.app_supply, [
      androidPackage,
      path,
      key,
    ]);
    if (supply.result !== 'success') {
      printError(supply, 'supply');
    }
  };
}
