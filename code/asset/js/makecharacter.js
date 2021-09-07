import * as THREE from '/build/three.module.js';

//이미지 템플릿 모음
const image_template = ['template1.png', 'template2.png', 'template3.png', 'template4.png', 'template5.png'];
//선택된 이미지 좌표
const selected_image = [0, 0, 0];
//이미지당 할당 mesh
const texture_change_set = [[5],[2, 3, 4],[0, 1]];

//scene 생성
const scene = new THREE.Scene();

//canvas 해상도 조정
const canvas = document.querySelector('#view');
const dpr = window.devicePixelRatio;
canvas.width = Math.round(dpr * canvas.clientWidth);
canvas.height = Math.round(dpr * canvas.clientHeight);

//카메라 설정
const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);

camera.position.z = 30;
camera.position.y = 20;
camera.lookAt(0, 0, 0);
//renderer 설정
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });


//light 설정                                                
const color = 0xFFFFFF;
const intensity = 1;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

//이미지에서 각 component에 따른 상대 위치 좌표 규정
const uv_map = [
    //leg_and_arm
    [[[4, 12], [8, 12], [8, 16], [4, 16]],
    [[8, 12], [12, 12], [12, 16], [8, 16]],
    [[0, 0], [4, 0], [4, 12], [0, 12]],
    [[4, 0], [8, 0], [8, 12], [4, 12]],
    [[8, 0], [12, 0], [12, 12], [8, 12]],
    [[12, 0], [16, 0], [16, 12], [12, 12]]],
    //body
    [[[20, 44], [28, 44], [28, 48], [20, 48]],
    [[28, 44], [36, 44], [36, 48], [28, 48]],
    [[16, 32], [20, 32], [20, 44], [16, 44]],
    [[20, 32], [28, 32], [28, 44], [20, 44]],
    [[28, 32], [36, 32], [36, 44], [28, 44]],
    [[36, 32], [40, 32], [40, 44], [36, 44]]],
    //head
    [[[8, 56], [16, 56], [16, 64], [8, 64]],
    [[16, 56], [24, 56], [24, 64], [16, 64]],
    [[0, 48], [8, 48], [8, 56], [0, 56]],
    [[8, 48], [16, 48], [16, 56], [8, 56]],
    [[16, 48], [24, 48], [24, 56], [16, 56]],
    [[24, 48], [32, 48], [32, 56], [24, 56]]]
];

//각 component의 uv 절대좌표 반환을 위한 설정
const uv_position = {
    left_leg: {
        index: 0,
        x: 0,
        y: 32
    },
    right_leg: {
        index: 0,
        x: 16,
        y: 0
    },
    left_arm: {
        index: 0,
        x: 32,
        y: 0
    },
    right_arm: {
        index: 0,
        x: 40,
        y: 32
    },
    body: {
        index: 1,
        x: 0,
        y: 0
    },
    head: {
        index: 2,
        x: 0,
        y: 0
    }
}


//component의 world space에서의 좌표 보정을 위한 설정
const character_position = [
    -2, -12, 0,
    2, -12, 0,
    0, 0, 0,
    -6, 0, 0,
    6, 0, 0,
    0, 10, 0
];

//bone 위치 설정
const bone_position = [
    -2, -6, 0,
    2, -6, 0,
    0, -10, 0,
    -6, 6, 0,
    6, 6, 0,
    0, 6, 0
];

//bone 생성
const bones = MakeBones();
const skeleton = new THREE.Skeleton(bones);

let character = new THREE.Object3D();
let character_geometry = [];

MakeCharacterGeometry(character_geometry);

for (let character_geometry_index = 0; character_geometry_index < 6; ++character_geometry_index) {
    const texture = new THREE.TextureLoader().load("../character/" + image_template[0]);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const cube = new THREE.SkinnedMesh(character_geometry[character_geometry_index], material);
    cube.position.x = character_position[character_geometry_index * 3];
    cube.position.y = character_position[character_geometry_index * 3 + 1];
    cube.position.z = character_position[character_geometry_index * 3 + 2];
    cube.add(skeleton.bones[2]);
    cube.bind(skeleton);
    character.add(cube);
}

scene.add(character);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

//0: left_leg, 1: right_leg, 2: body, 3: left_arm, 4:right_arm, 5: head
function MakeCharacterGeometry(character) {
    character_geometry.push(MakeBox(4, 12, 4, 'left_leg', 0));
    character_geometry.push(MakeBox(4, 12, 4, 'right_leg', 1));
    character_geometry.push(MakeBox(8, 12, 4, 'body', 2));
    character_geometry.push(MakeBox(4, 12, 4, 'left_arm', 3));
    character_geometry.push(MakeBox(4, 12, 4, 'right_arm', 4));
    character_geometry.push(MakeBox(8, 8, 8, 'head', 5));
}
//buffergeometry를 통한 custom mesh 생성
function MakeBox(nx, ny, nz, character_component, skeleton_index) {
    const geometry = new THREE.BufferGeometry();
    const x = nx / 2;
    const y = ny / 2;
    const z = nz / 2;
    const vertices = new Float32Array([
        //top
        -x, y, z,
        x, y, z,
        -x, y, -z,
        x, y, z,
        x, y, -z,
        -x, y, -z,
        //bottom
        -x, -y, -z,
        x, -y, -z,
        -x, -y, z,
        x, -y, -z,
        x, -y, z,
        -x, -y, z,
        //right
        -x, -y, -z,
        -x, -y, z,
        -x, y, -z,
        -x, -y, z,
        -x, y, z,
        -x, y, -z,
        //front
        -x, -y, z,
        x, -y, z,
        -x, y, z,
        x, -y, z,
        x, y, z,
        -x, y, z,
        //left
        x, -y, z,
        x, -y, -z,
        x, y, z,
        x, -y, -z,
        x, y, -z,
        x, y, z,
        //back
        x, -y, -z,
        -x, -y, -z,
        x, y, -z,
        -x, -y, -z,
        -x, y, -z,
        x, y, -z
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    //uv(texture) mapping
    let uvs = [];
    const uv_map_information = uv_position[character_component];
    const uv_map_index = uv_map_information.index;
    const move_x = uv_map_information.x;
    const move_y = uv_map_information.y;
    for (var i = 0; i < 6; ++i) {
        uvs.push((uv_map[uv_map_index][i][0][0] + move_x) / 64, (uv_map[uv_map_index][i][0][1] + move_y) / 64);
        uvs.push((uv_map[uv_map_index][i][1][0] + move_x) / 64, (uv_map[uv_map_index][i][1][1] + move_y) / 64);
        uvs.push((uv_map[uv_map_index][i][3][0] + move_x) / 64, (uv_map[uv_map_index][i][3][1] + move_y) / 64);
        uvs.push((uv_map[uv_map_index][i][1][0] + move_x) / 64, (uv_map[uv_map_index][i][1][1] + move_y) / 64);
        uvs.push((uv_map[uv_map_index][i][2][0] + move_x) / 64, (uv_map[uv_map_index][i][2][1] + move_y) / 64);
        uvs.push((uv_map[uv_map_index][i][3][0] + move_x) / 64, (uv_map[uv_map_index][i][3][1] + move_y) / 64);
    }
    //skeleton에 각 좌표를 할당하기 위한 버퍼 생성
    const skin_indices = [];
    const skin_weights = [];
    for (let i = 0; i < 36; ++i) {
        skin_indices.push(skeleton_index, 0, 0, 0);
        skin_weights.push(1, 0, 0, 0);
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skin_indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skin_weights, 4));

    return geometry;
}

const image_change = document.getElementById("image_upload");

//이미지를 업로드하기 위한 구현
image_change.addEventListener('change', (event) => {
    const img_reader = new FileReader();
    img_reader.onload = function (event) {
        const img = document.createElement("img");
        img.src = event.target.result;
        MakeCharacterByUploadImg(img.src);
    }
    img_reader.readAsDataURL(event.target.files[0]);
});

//업로드된 이미지를 기반으로 캐릭터 재생성
function MakeCharacterByUploadImg(img) {
    const texture = new THREE.TextureLoader().load(img);
    for (let character_index = 0; character_index < 6; ++character_index) {
        character.children[character_index].material.map.dispose();
        character.children[character_index].material.map = texture;
    }
}

const make_character = document.getElementById("make_character");

//생성된 캐릭터를 json 형식으로 서버에 post
make_character.addEventListener('click', () => {
    const form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', '/makecharacter');

    const id = document.createElement('input');
    id.setAttribute('name', 'id');
    id.setAttribute('value', document.cookie.split('id=')[1]);
    form.appendChild(id);

    const character_form_input = document.createElement('input');
    character_form_input.setAttribute('name', 'character_json');
    character_form_input.setAttribute('value', JSON.stringify(character.toJSON()));
    form.appendChild(character_form_input);
    form.style.display = "none";
    document.body.appendChild(form);
    form.submit();
});

//bone 생성을 위한 함수
function MakeBones() {
    const bones = [];
    for (let insert_time = 0; insert_time < 6; ++insert_time) {
        const bone = new THREE.Bone();
        bone.position.set(bone_position[3 * insert_time], bone_position[3 * insert_time + 1], bone_position[3 * insert_time + 2]);
        bones.push(bone);
    }
    //몸체에 해당하는 것이 bone[2]이므로 이를 루트로 가지게 만든다. 
    for (let root_add_index = 0; root_add_index < 6; ++root_add_index) {
        if (root_add_index !== 2) {
            bones[2].add(bones[root_add_index]);
        }
    }

    return bones;
}

//머리, 몸, 다리 텍스쳐 변환 이벤트 구현
const next_changer_button = document.getElementsByClassName("next");

for (let button_index = 0; button_index < 3; ++button_index) {
    next_changer_button[button_index].addEventListener('click', () => {
        selected_image[button_index] = (selected_image[button_index] + 1) % 5;
        const change_mesh = texture_change_set[button_index];

        Change_Texture(selected_image[button_index], change_mesh, character);
    });
}

const before_changer_button = document.getElementsByClassName("before");

for (let button_index = 0; button_index < 3; ++button_index) {
    before_changer_button[button_index].addEventListener('click', () => {
        selected_image[button_index] = (selected_image[button_index] + 4) % 5;
        const change_mesh = texture_change_set[button_index];

        Change_Texture(selected_image[button_index], change_mesh, character);
    });
}

//텍스쳐 변경 함수
function Change_Texture(picture_index, change_mesh, character){
    const texture = new THREE.TextureLoader().load("../character/" + image_template[picture_index]);
    for(let change_mesh_index = 0; change_mesh_index < change_mesh.length; ++change_mesh_index){
        const change_num = change_mesh[change_mesh_index];
        character.children[change_num].material.map.dispose();
        character.children[change_num].material.map = texture;
    }
}