import { readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';

type Config = {
  port: number;
  mysql: Mysql;
  ossConfigPath: string;
  ossConfig: object;
  authConfigPath: string;
  authConfig: any;
};

type Mysql = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

type Oss = {
  region: string;
  accessKeyId: string
  accessKeySecret: string
  bucket: string
}

type Auth = {
  clientSecret: string;
  clienId: string;
}

const configPath = join(__dirname, `config.${process.env.NODE_ENV || 'local'}.yml`);
const config = load(readFileSync(configPath, 'utf8')) as Config;

if (config.ossConfigPath) {
  try {
    config.ossConfig = load(readFileSync(join(__dirname, config.ossConfigPath), 'utf8')) as Oss;
  } catch (error) {
    config.ossConfig = null;
  }
}

if (config.authConfigPath) {
  try {
    config.authConfig = load(readFileSync(join(__dirname, config.authConfigPath), 'utf8')) as Auth;
  } catch (error) {
    config.authConfig = null;
  }
}
export default config;
