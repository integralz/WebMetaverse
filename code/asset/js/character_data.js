const startx = 0;
const starty = 0;
const startz = 0;

module.exports = {
    MakeCharacter: function () {
        //계정명, 캐릭터의 x, y, z좌표, 색으로 데이터 구축
        const character_data = {
            id: "",
            x: startx,
            y: starty,
            z: startz,
            character_json: ""
        };
        return character_data;
    }
};