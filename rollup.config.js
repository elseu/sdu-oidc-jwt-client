import createDefaultRollupConfig from '@elseu/sdu-react-scripts-rollup';

import pkg from './package.json';

const defaultRollupConfig = createDefaultRollupConfig(pkg);

export default {
  ...defaultRollupConfig,
};
