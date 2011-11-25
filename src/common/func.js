vector = function vector(x)
{
    if (x) {
        return x/Math.abs(x);
    } else {
        return 0;
    }
};

battleCityTypesSerialize = {
    'Bullet'            : 1,
    'Tank'              : 2,
    'TankBot'           : 3,
    'HeavyTankBot'      : 4,
    'FastBulletTankBot' : 5,
    'FastTankBot'       : 6,
    'Wall'              : 7,
    'SteelWall'         : 8,
    'BonusTimer'        : 9,
    'BonusShovel'       : 10,
    'BonusStar'         : 11,
    'BonusHelmet'       : 12,
    'BonusLive'         : 13,
    'BonusGrenade'      : 14,
    'Water'             : 15,
    'Trees'             : 16,
    'Ice'               : 17,
    'Delimiter'         : 18,
    'Base'              : 19
};

battleCityTypesUnserialize = {};
for (var i in battleCityTypesSerialize) {
    battleCityTypesUnserialize[battleCityTypesSerialize[i]] = i;
}