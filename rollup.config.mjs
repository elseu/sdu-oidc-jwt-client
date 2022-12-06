import createDefaultRollupConfig from '@elseu/sdu-react-scripts-rollup';
import { readFile } from 'fs/promises';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url)));

const defaultRollupConfig = createDefaultRollupConfig.default(pkg);

export default {
  ...defaultRollupConfig,
};
