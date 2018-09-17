import _ from 'lodash';
import child_process from 'child_process';
import log from '../../log';

export function ensureArgumentsAreDefined(values) {
  const nilKeys = _.keys(values).filter(key => _.isNil(values[key]));
  if (nilKeys.length) {
    throw new Error(`Not all required arguments were defined. ${nilKeys} needs to be defined`);
  }
}

export async function spawnAndCollectJSONOutputAsync(program, args) {
  return new Promise((resolve, reject) => {
    try {
      const wrapped = [`${args.join(' ')}`];
      const options = { stdio: ['inherit', 'inherit', 'pipe'] };
      const child = child_process.spawnSync(program, wrapped, options);
      const rawJson = child.stderr.toString();
      resolve(JSON.parse(rawJson));
    } catch (error) {
      reject(error);
    }
  });
}

export function printError(result, type) {
  if (result.rawDump.message) {
    log.warn(result.rawDump.message);
  } else {
    log.warn('Returned json: ');
    console.dir(result.rawDump);
  }
}
