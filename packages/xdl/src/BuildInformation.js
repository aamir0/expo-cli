import ApiV2Client from './ApiV2';
import UserManager from './User';
import * as ProjectUtils from './project/ProjectUtils';

export async function getBuildInformation(options, projectDir) {
  await UserManager.ensureLoggedInAsync();
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  const { id, platform, limit, status } = options;
  const request = {
    manifest: exp,
    options: {
      id,
      platform: platform == null ? 'all' : platform,
      limit,
      status: status == null ? 'finished' : platform,
    },
  }
  try {
    const { builds } = await api.putAsync('buildInformation/get', request)
    return builds
  } catch(error) {
    return []
  }
}
