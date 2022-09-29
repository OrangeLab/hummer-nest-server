import { flatten } from "lodash";
/** demo
 * input: [{
    name : "Andrea",
    age : 31,
    gender : "Male",
    skilled : true
  }, {
    name : "Eva",
    age : 27,
    gender : "Female",
    skilled : true
  }, {
    name : "Daniele",
    age : 26,
    gender : "Male",
    skilled: false
  }]
 * output: [
    ["name", "age", "gender", "skilled"],
    ["Andrea", 31, "Male", true],
    ["Eva", 27, "Female", true],
    ["Daniele", 26, "Male", false]
  ]
 */

export function hpack(json: object[]): any[][] {
  const keys: string[] = flatten(json.map(item => Object.keys(item)));
  const uniqKeys = [...new Set(keys)];
  const hpJson: any[] = [];
  json.forEach(item => {
    const hpJsonItem: any[] = [];
    uniqKeys.forEach((key, index) => {
      if (Reflect.has(item, key)) {
        hpJsonItem[index] = item[key];
      }
    });
    hpJson.push(hpJsonItem);
  });
  return [uniqKeys, ...hpJson];
}

export function unhpack(json: any[][]): object[] {
  const [uniqKeys, ...hpJson] = json;
  if (!Array.isArray(uniqKeys)) return json; // 隐藏处理
  const finalJson: object[] = [];
  hpJson.forEach((item: any[]) => {
    const jsonItem: object = {};
    uniqKeys.forEach((key, index) => {
      if (item[index] !== undefined) {
        jsonItem[key] = item[index];
      }
    });
    finalJson.push(jsonItem);
  });
  return finalJson;
}
