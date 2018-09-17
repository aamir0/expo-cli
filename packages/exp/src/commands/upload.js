import IOSUploader from './upload/IOSUploader';
import AndroidUploader from './upload/AndroidUploader';

export default (program: any) => {
  program
    .command('upload:android [projectDir]')
    .option('--id <id>', 'Upload build with provided id')
    .option('--latest', 'Upload latest build')
    .option('--path <path>', 'Upload local build')
    .option('--key <key>', 'JSON key used to authenticate with Google Play Store')
    .description('Upload standalone android app to Google Play Store')
    .asyncActionProjectDir(async (projectDir, command) => {
      const uploader = new AndroidUploader(projectDir, command);
      await uploader.upload();
    });

  program
    .command('upload:ios [projectDir]')
    .option('--id <id>', 'Upload build with provided id')
    .option('--latest', 'Upload latest build')
    .option('--path <path>', 'Upload local build')
    .option('--apple-id <apple-id>', 'Your Apple ID')
    .description('Uploads standalone app to App Store. It works only on macOS')
    .asyncActionProjectDir(async (projectDir, command) => {
      const uploader = new IOSUploader(projectDir, command);
      await uploader.upload();
    });
};
