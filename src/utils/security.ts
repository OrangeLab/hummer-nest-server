/* eslint-disable no-plusplus */
/* eslint-disable no-continue */
import * as randToken from 'rand-token';
import * as randombytes from 'randombytes';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import _ from 'lodash';

interface TokenType {
  identical: string;
  token: string;
}

const security: any = {};

security.randToken = (num) => {
  return randToken
    .generator({
      chars: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      source: randombytes
    })
    .generate(num);
};

security.parseToken = (token) => {
  return {identical: token.substr(-9,9), token:token.substr(0,28)}
}

security.md5 = (str) => {
  const md5sum = crypto.createHash('md5');
  md5sum.update(str);
  return md5sum.digest('hex');
}

security.fileSha256 = (file) => {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(file);
    const hash = crypto.createHash('sha256');
    rs.on('data', hash.update.bind(hash));
    rs.on('error', (e) => {
      reject(e);
    });
    rs.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}

security.stringSha256Sync = (contents) => {
  const sha256 = crypto.createHash('sha256');
  sha256.update(contents);
  return sha256.digest('hex');
}

security.stringSha1Sync = (contents) => {
  const sha1 = crypto.createHash('sha1');
  sha1.update(contents);
  return sha1.digest('hex');
}

security.packageHashSync = (jsonData) => {
  const sortedArr = security.sortJsonToArr(jsonData);
  const manifestData = _.map(sortedArr, (v) => {
    return `${v.path  }:${  v.hash}`;
  });
  // log.debug('packageHashSync manifestData:', manifestData);
  let manifestString = JSON.stringify(manifestData.sort());
  manifestString = _.replace(manifestString, /\\\//g, '/');
  // log.debug('packageHashSync manifestString:', manifestData);
  return security.stringSha256Sync(manifestString);
}

security.sha256AllFiles = (files) => {
  return new Promise((resolve) => {
    const results = {};
    const {length} = files;
    let count = 0;
    files.forEach((file) => {
      security.fileSha256(file)
      .then((hash) => {
        results[file] = hash;
        // eslint-disable-next-line no-plusplus
        count++;
        if (count === length) {
          resolve(results);
        }
      });
    });
  });
}
// from crypto-random-string
security.numericToken = (length = 0): string => {
  const characters = '123456789'.split('');
	const characterCount = characters.length;
	const maxValidSelector = (Math.floor(0x10000 / characterCount) * characterCount) - 1; // Using values above this will ruin distribution when using modular division
	const entropyLength = 2 * Math.ceil(1.1 * length); // Generating a bit more than required so chances we need more than one pass will be really low
	let string = '';
	let stringLength = 0;

	while (stringLength < length) { // In case we had many bad values, which may happen for character sets of size above 0x8000 but close to it
		const entropy = crypto.randomBytes(entropyLength);
		let entropyPosition = 0;

		while (entropyPosition < entropyLength && stringLength < length) {
			const entropyValue = entropy.readUInt16LE(entropyPosition);
			entropyPosition += 2;
			if (entropyValue > maxValidSelector) { // Skip values which will ruin distribution when using modular division
				continue;
			}

			string += characters[entropyValue % characterCount];
			stringLength++;
		}
	}

	return string;
};

export default security;