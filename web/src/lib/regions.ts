export interface RegionInfo {
  id: number;
  soato: string;
  name: string;
  shortName: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  districts: { soato?: string; name: string }[];
}

export const UZBEKISTAN_CENTER: [number, number] = [41.3775, 64.5853];
export const UZBEKISTAN_ZOOM: number = 6;

export const UZBEKISTAN_REGIONS: Record<string, RegionInfo> = {
  '1718': {
    id: 10,
    soato: '1718',
    name: 'Samarqand viloyati',
    shortName: 'Samarqand',
    center: [39.6542, 66.9597],
    zoom: 12,
    districts: [
      { soato: '1718401', name: 'Samarqand shahar' },
      { soato: '1718406', name: 'Kattaqo\'rg\'on shahar' },
      { soato: '1718203', name: 'Oqdaryo tumani' },
      { soato: '1718206', name: 'Bulung\'ur tumani' },
      { soato: '1718209', name: 'Jomboy tumani' },
      { soato: '1718212', name: 'Ishtixon tumani' },
      { soato: '1718215', name: 'Kattaqo\'rg\'on tumani' },
      { soato: '1718216', name: 'Qo\'shrabot tumani' },
      { soato: '1718218', name: 'Narpay tumani' },
      { soato: '1718224', name: 'Nurobod tumani' },
      { soato: '1718227', name: 'Pastdarg\'om tumani' },
      { soato: '1718230', name: 'Paxtachi tumani' },
      { soato: '1718233', name: 'Payariq tumani' },
      { soato: '1718235', name: 'Samarqand tumani' },
      { soato: '1718236', name: 'Toyloq tumani' },
      { soato: '1718238', name: 'Urgut tumani' }
    ]
  },
  '1726': {
    id: 14,
    soato: '1726',
    name: 'Toshkent shahri',
    shortName: 'Toshkent sh.',
    center: [41.3111, 69.2797],
    zoom: 12,
    districts: [
      { soato: '1726262', name: 'Bektemir tumani' },
      { soato: '1726266', name: 'Mirobod tumani' },
      { soato: '1726269', name: 'Mirzo Ulug\'bek tumani' },
      { soato: '1726273', name: 'Sergeli tumani' },
      { soato: '1726277', name: 'Olmazor tumani' },
      { soato: '1726280', name: 'Uchtepa tumani' },
      { soato: '1726283', name: 'Chilonzor tumani' },
      { soato: '1726287', name: 'Shayxontohur tumani' },
      { soato: '1726290', name: 'Yunusobod tumani' },
      { soato: '1726294', name: 'Yakkasaroy tumani' },
      { soato: '1726296', name: 'Yashnobod tumani' },
      { soato: '1726298', name: 'Yangihayot tumani' }
    ]
  },
  '1727': {
    id: 13,
    soato: '1727',
    name: 'Toshkent viloyati',
    shortName: 'Toshkent vil.',
    center: [41.2721, 69.2163],
    zoom: 10,
    districts: [
      { soato: '1727401', name: 'Nurafshon shahar' },
      { soato: '1727404', name: 'Angren shahar' },
      { soato: '1727407', name: 'Bekobod shahar' },
      { soato: '1727415', name: 'Olmaliq shahar' },
      { soato: '1727424', name: 'Chirchiq shahar' },
      { soato: '1727428', name: 'Yangiyo\'l shahar' },
      { soato: '1727206', name: 'Bekobod tumani' },
      { soato: '1727212', name: 'Bo\'stonliq tumani' },
      { soato: '1727215', name: 'Bo\'ka tumani' },
      { soato: '1727220', name: 'Zangiota tumani' },
      { soato: '1727224', name: 'Qibray tumani' },
      { soato: '1727228', name: 'Quyi Chirchiq tumani' },
      { soato: '1727233', name: 'Oqqo\'rg\'on tumani' },
      { soato: '1727237', name: 'Ohangaron tumani' },
      { soato: '1727239', name: 'Parkent tumani' },
      { soato: '1727242', name: 'Piskent tumani' },
      { soato: '1727248', name: 'Toshkent tumani' },
      { soato: '1727250', name: 'O\'rta Chirchiq tumani' },
      { soato: '1727253', name: 'Chinoz tumani' },
      { soato: '1727256', name: 'Yuqori Chirchiq tumani' },
      { soato: '1727259', name: 'Yangiyo\'l tumani' }
    ]
  },
  '1730': {
    id: 3,
    soato: '1730',
    name: 'Farg\'ona viloyati',
    shortName: 'Farg\'ona',
    center: [40.3842, 71.7843],
    zoom: 10,
    districts: [
      { soato: '1730401', name: 'Farg\'ona shahar' },
      { soato: '1730405', name: 'Marg\'ilon shahar' },
      { soato: '1730408', name: 'Qo\'qon shahar' },
      { soato: '1730412', name: 'Quvasoy shahar' },
      { soato: '1730203', name: 'Beshariq tumani' },
      { soato: '1730206', name: 'Bog\'dod tumani' },
      { soato: '1730209', name: 'Buvayda tumani' },
      { soato: '1730212', name: 'Dang\'ara tumani' },
      { soato: '1730215', name: 'Yozyovon tumani' },
      { soato: '1730218', name: 'Quva tumani' },
      { soato: '1730221', name: 'Oltiariq tumani' },
      { soato: '1730224', name: 'Rishton tumani' },
      { soato: '1730227', name: 'So\'x tumani' },
      { soato: '1730230', name: 'Toshloq tumani' },
      { soato: '1730233', name: 'O\'zbekiston tumani' },
      { soato: '1730236', name: 'Uchko\'prik tumani' },
      { soato: '1730238', name: 'Farg\'ona tumani' },
      { soato: '1730242', name: 'Furqat tumani' }
    ]
  },
  '1706': {
    id: 2,
    soato: '1706',
    name: 'Buxoro viloyati',
    shortName: 'Buxoro',
    center: [39.7747, 64.4286],
    zoom: 10,
    districts: [
      { soato: '1706401', name: 'Buxoro shahar' },
      { soato: '1706405', name: 'Kogon shahar' },
      { soato: '1706207', name: 'Buxoro tumani' },
      { soato: '1706212', name: 'Vobkent tumani' },
      { soato: '1706215', name: 'G\'ijduvon tumani' },
      { soato: '1706219', name: 'Jondor tumani' },
      { soato: '1706222', name: 'Kogon tumani' },
      { soato: '1706226', name: 'Olot tumani' },
      { soato: '1706230', name: 'Peshku tumani' },
      { soato: '1706232', name: 'Romitan tumani' },
      { soato: '1706238', name: 'Shofirkon tumani' },
      { soato: '1706240', name: 'Qorako\'l tumani' },
      { soato: '1706242', name: 'Qorovulbozor tumani' }
    ]
  },
  '1733': {
    id: 5,
    soato: '1733',
    name: 'Xorazm viloyati',
    shortName: 'Xorazm',
    center: [41.5564, 60.6313],
    zoom: 10,
    districts: [
      { soato: '1733401', name: 'Urganch shahar' },
      { soato: '1733406', name: 'Xiva shahar' },
      { soato: '1733203', name: 'Bog\'ot tumani' },
      { soato: '1733206', name: 'Gurlan tumani' },
      { soato: '1733210', name: 'Xonqa tumani' },
      { soato: '1733214', name: 'Hazorasp tumani' },
      { soato: '1733217', name: 'Xiva tumani' },
      { soato: '1733220', name: 'Qo\'shko\'pir tumani' },
      { soato: '1733223', name: 'Shovot tumani' },
      { soato: '1733226', name: 'Urganch tumani' },
      { soato: '1733230', name: 'Yangiariq tumani' },
      { soato: '1733233', name: 'Yangibozor tumani' },
      { soato: '1733236', name: 'Tupproqqal\'a tumani' }
    ]
  },
  '1703': {
    id: 1,
    soato: '1703',
    name: 'Andijon viloyati',
    shortName: 'Andijon',
    center: [40.7821, 72.3442],
    zoom: 11,
    districts: [
      { soato: '1703401', name: 'Andijon shahar' },
      { soato: '1703408', name: 'Xonobod shahar' },
      { soato: '1703203', name: 'Andijon tumani' },
      { soato: '1703206', name: 'Asaka tumani' },
      { soato: '1703209', name: 'Baliqchi tumani' },
      { soato: '1703211', name: 'Bo\'z tumani' },
      { soato: '1703214', name: 'Buloqboshi tumani' },
      { soato: '1703217', name: 'Jalaquduq tumani' },
      { soato: '1703220', name: 'Izboskan tumani' },
      { soato: '1703224', name: 'Qo\'rg\'ontepa tumani' },
      { soato: '1703227', name: 'Marhamat tumani' },
      { soato: '1703230', name: 'Oltinko\'l tumani' },
      { soato: '1703232', name: 'Paxtaobod tumani' },
      { soato: '1703236', name: 'Ulug\'nor tumani' },
      { soato: '1703239', name: 'Xo\'jaobod tumani' },
      { soato: '1703242', name: 'Shahrixon tumani' }
    ]
  },
  '1714': {
    id: 6,
    soato: '1714',
    name: 'Namangan viloyati',
    shortName: 'Namangan',
    center: [40.9983, 71.6726],
    zoom: 11,
    districts: [
      { soato: '1714401', name: 'Namangan shahar' },
      { soato: '1714204', name: 'Kosonsoy tumani' },
      { soato: '1714207', name: 'Mingbuloq tumani' },
      { soato: '1714212', name: 'Namangan tumani' },
      { soato: '1714216', name: 'Norin tumani' },
      { soato: '1714219', name: 'Pop tumani' },
      { soato: '1714224', name: 'To\'raqo\'rg\'on tumani' },
      { soato: '1714229', name: 'Uychi tumani' },
      { soato: '1714234', name: 'Uchqo\'rg\'on tumani' },
      { soato: '1714236', name: 'Chortoq tumani' },
      { soato: '1714237', name: 'Chust tumani' },
      { soato: '1714242', name: 'Yangiqo\'rg\'on tumani' }
    ]
  },
  '1710': {
    id: 8,
    soato: '1710',
    name: 'Qashqadaryo viloyati',
    shortName: 'Qashqadaryo',
    center: [38.8416, 65.7901],
    zoom: 10,
    districts: [
      { soato: '1710401', name: 'Qarshi shahar' },
      { soato: '1710405', name: 'Shahrisabz shahar' },
      { soato: '1710207', name: 'G\'uzor tumani' },
      { soato: '1710212', name: 'Dehqonobod tumani' },
      { soato: '1710218', name: 'Qamashi tumani' },
      { soato: '1710224', name: 'Qarshi tumani' },
      { soato: '1710229', name: 'Koson tumani' },
      { soato: '1710232', name: 'Kitob tumani' },
      { soato: '1710233', name: 'Mirishkor tumani' },
      { soato: '1710234', name: 'Muborak tumani' },
      { soato: '1710237', name: 'Nishon tumani' },
      { soato: '1710242', name: 'Kasbi tumani' },
      { soato: '1710245', name: 'Chiroqchi tumani' },
      { soato: '1710250', name: 'Shahrisabz tumani' },
      { soato: '1710253', name: 'Yakkabog\' tumani' },
      { soato: '1710255', name: 'Ko\'kdala tumani' }
    ]
  },
  '1712': {
    id: 7,
    soato: '1712',
    name: 'Navoiy viloyati',
    shortName: 'Navoiy',
    center: [40.0844, 65.3792],
    zoom: 9,
    districts: [
      { soato: '1712401', name: 'Navoiy shahar' },
      { soato: '1712408', name: 'Zarafshon shahar' },
      { soato: '1712204', name: 'Konimex tumani' },
      { soato: '1712208', name: 'Qiziltepa tumani' },
      { soato: '1712216', name: 'Navbahor tumani' },
      { soato: '1712224', name: 'Karmana tumani' },
      { soato: '1712232', name: 'Nurota tumani' },
      { soato: '1712238', name: 'Tomdi tumani' },
      { soato: '1712244', name: 'Uchquduq tumani' },
      { soato: '1712248', name: 'Xatirchi tumani' }
    ]
  },
  '1722': {
    id: 12,
    soato: '1722',
    name: 'Surxondaryo viloyati',
    shortName: 'Surxondaryo',
    center: [37.2286, 67.2753],
    zoom: 10,
    districts: [
      { soato: '1722401', name: 'Termiz shahar' },
      { soato: '1722203', name: 'Angor tumani' },
      { soato: '1722206', name: 'Boysun tumani' },
      { soato: '1722209', name: 'Denov tumani' },
      { soato: '1722212', name: 'Jarqo\'rg\'on tumani' },
      { soato: '1722215', name: 'Qiziriq tumani' },
      { soato: '1722217', name: 'Qumqo\'rg\'on tumani' },
      { soato: '1722220', name: 'Muzrabot tumani' },
      { soato: '1722223', name: 'Oltinsoy tumani' },
      { soato: '1722226', name: 'Sariosiyo tumani' },
      { soato: '1722230', name: 'Termiz tumani' },
      { soato: '1722234', name: 'Uzun tumani' },
      { soato: '1722238', name: 'Sherobod tumani' },
      { soato: '1722240', name: 'Sho\'rchi tumani' },
      { soato: '1722243', name: 'Bandixon tumani' }
    ]
  },
  '1708': {
    id: 4,
    soato: '1708',
    name: 'Jizzax viloyati',
    shortName: 'Jizzax',
    center: [40.1158, 67.8422],
    zoom: 10,
    districts: [
      { soato: '1708401', name: 'Jizzax shahar' },
      { soato: '1708204', name: 'Arnasoy tumani' },
      { soato: '1708209', name: 'Baxmal tumani' },
      { soato: '1708212', name: 'G\'allaorol tumani' },
      { soato: '1708215', name: 'Sharof Rashidov tumani' },
      { soato: '1708218', name: 'Do\'stlik tumani' },
      { soato: '1708223', name: 'Zomin tumani' },
      { soato: '1708225', name: 'Zarbdor tumani' },
      { soato: '1708228', name: 'Zafarobod tumani' },
      { soato: '1708235', name: 'Mirzacho\'l tumani' },
      { soato: '1708237', name: 'Paxtakor tumani' },
      { soato: '1708240', name: 'Forish tumani' },
      { soato: '1708250', name: 'Yangiobod tumani' }
    ]
  },
  '1735': {
    id: 9,
    soato: '1735',
    name: 'Qoraqalpog\'iston Respublikasi',
    shortName: 'Qoraqalpog\'iston',
    center: [42.4602, 59.6166],
    zoom: 8,
    districts: [
      { soato: '1735401', name: 'Nukus shahar' },
      { soato: '1735204', name: 'Amudaryo tumani' },
      { soato: '1735207', name: 'Beruniy tumani' },
      { soato: '1735209', name: 'Bo\'zatov tumani' },
      { soato: '1735212', name: 'Qorao\'zak tumani' },
      { soato: '1735215', name: 'Kegeyli tumani' },
      { soato: '1735218', name: 'Qo\'ng\'irot tumani' },
      { soato: '1735221', name: 'Qonliko\'l tumani' },
      { soato: '1735224', name: 'Mo\'ynoq tumani' },
      { soato: '1735227', name: 'Nukus tumani' },
      { soato: '1735230', name: 'Taxiatosh tumani' },
      { soato: '1735233', name: 'Taxtako\'pir tumani' },
      { soato: '1735236', name: 'To\'rtko\'l tumani' },
      { soato: '1735240', name: 'Xo\'jayli tumani' },
      { soato: '1735243', name: 'Chimboy tumani' },
      { soato: '1735247', name: 'Sho\'manoy tumani' },
      { soato: '1735250', name: 'Ellikqal\'a tumani' }
    ]
  },
  '1724': {
    id: 11,
    soato: '1724',
    name: 'Sirdaryo viloyati',
    shortName: 'Sirdaryo',
    center: [40.4983, 68.7842],
    zoom: 10,
    districts: [
      { soato: '1724401', name: 'Guliston shahar' },
      { soato: '1724405', name: 'Shirin shahar' },
      { soato: '1724413', name: 'Yangiyer shahar' },
      { soato: '1724206', name: 'Oqoltin tumani' },
      { soato: '1724212', name: 'Boyovut tumani' },
      { soato: '1724216', name: 'Sayxunobod tumani' },
      { soato: '1724220', name: 'Guliston tumani' },
      { soato: '1724224', name: 'Sardoba tumani' },
      { soato: '1724228', name: 'Mirzaobod tumani' },
      { soato: '1724231', name: 'Sirdaryo tumani' },
      { soato: '1724235', name: 'Xovos tumani' }
    ]
  }
};

// Helpers
export const REGION_LIST = Object.values(UZBEKISTAN_REGIONS);

export function getRegionBySoato(soato: string): RegionInfo | undefined {
  if (!soato) return undefined;
  const prefix = soato.substring(0, 4);
  return UZBEKISTAN_REGIONS[prefix];
}

export function getRegionName(soato: string): string {
  const reg = getRegionBySoato(soato);
  return reg ? reg.name : 'Noma\'lum hudud';
}

export function getDistrictName(districtSoato: string, regionSoato?: string): string {
  if (!districtSoato) return '';
  const prefix = regionSoato ? regionSoato.substring(0, 4) : districtSoato.substring(0, 4);
  const reg = UZBEKISTAN_REGIONS[prefix];
  if (reg) {
    const d = reg.districts.find(item => item.soato === districtSoato);
    if (d) return d.name;
  }
  return '';
}

export function getDistrictsForRegion(regionSoato: string): string[] {
  if (!regionSoato) {
    // Return all districts across all regions
    const all: string[] = [];
    REGION_LIST.forEach(r => {
      r.districts.forEach(d => {
        if (!all.includes(d.name)) all.push(d.name);
      });
    });
    return all.sort((a, b) => a.localeCompare(b));
  }
  const prefix = regionSoato.substring(0, 4);
  const reg = UZBEKISTAN_REGIONS[prefix];
  return reg ? reg.districts.map(d => d.name) : [];
}
