import createDefaultRollupConfig from 'sdu-react-scripts/config/rollup';

import pkg from './package.json';

const defaultRollupConfig = createDefaultRollupConfig(pkg);

export default {
  ...defaultRollupConfig,
};
