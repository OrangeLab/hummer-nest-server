const cities = [
  {
    "id": "1",
    "name": "北京市"
  },
  {
    "id": "2",
    "name": "深圳市"
  },
  {
    "id": "3",
    "name": "广州市"
  },
  {
    "id": "4",
    "name": "上海市"
  },
  {
    "id": "5",
    "name": "杭州市"
  }
]

/**
 * 获取城市名称
 */
export const getNameByCityId = (city: string): string[] => {
  const cityIds = city.split(",");
  const cityNames: string[] = [];
  let i = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const cityData of cities) {
    if (cityIds.length === i) break;
    const index = cityIds.indexOf(cityData.id);
    if (index !== -1) {
      cityNames.push(cityData.name);
      i += 1;
    }
  }
  return cityNames;
};