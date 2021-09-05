import * as THREE from '/build/three.module.js';
import { GLTFLoader } from '/jsm/loaders/GLTFLoader.js';
const socket = io();

//json 형식의 object를 열기 위한 설정
const json_loader = new THREE.ObjectLoader();

//접속 중인 캐릭터를 담기 위한 배열 및 map
let character_container = {};

//scene 생성
const scene = new THREE.Scene();

//canvas 해상도 조정
const canvas = document.querySelector('#view');
const dpr = window.devicePixelRatio;
canvas.width = Math.round(dpr * canvas.clientWidth);
canvas.height = Math.round(dpr * canvas.clientHeight);

//카메라 설정
const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);

//renderer 설정
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

//light 설정                                                
const color = 0xFFFFFF;
const intensity = 1.5;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

//주변 환경 구성
const loader = new GLTFLoader();
LoadModel("road.glb", 0, 0, 0);
for (var k = 0; k < 8; ++k) {
    for (var z = 0; z < 8; ++z) {
        LoadModel("fastfood.glb", 60 * k - 60, 0, 60 * z - 120);
    }
}
LoadModel("fastfood.glb", -60, 0, -120);
LoadModel("fastfood.glb", 60, 0, 60);
LoadModel("gas.glb", 0, 0, 60);

//user의 캐릭터 초기화
let my_character;

//본인의 캐릭터 객체 생성
let my_character_position = {
    id: document.cookie.split('id=')[1],
    x: 0,
    y: 0,
    z: 0
};

//초기 카메라 위치 설정
camera.position.z = 15;
camera.position.y = 20;
camera.position.x = 0;
camera.lookAt(0, 0, 0);

//collision test를 대입할 world 설정
let world = [];

//collision을 판단하기 위한 단위 벡터 모임(상, 하, 좌, 우)
const collision_vector = [
    new THREE.Vector3(1.0, 0.0, 0.0),
    new THREE.Vector3(-1.0, 0.0, 0.0),
    new THREE.Vector3(0.0, 0.0, 1.0),
    new THREE.Vector3(0.0, 0.0, -1.0)
];
//collision 판단을 위한 예정 위치 설정
const collision_tester = {
    x: 12,
    y: 2.4,
    z: 0
};

//방향키 입력 이벤트 기입
document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
    if (my_character !== undefined) {
        let keyCode = event.which;
        // up
        if (keyCode == 38) {
            collision_tester.z -= 1;
            // down
        } else if (keyCode == 40) {
            collision_tester.z += 1;
            // left
        } else if (keyCode == 37) {
            collision_tester.x -= 1;
            // right
        } else if (keyCode == 39) {
            collision_tester.x += 1;
        }
        //명령한 이동에 대해서 collision이 발생하는지 안하는지에 따라 명령을 따를지 안따를지 판단
        if (!CheckCollision()) {
            my_character.position.x = collision_tester.x;
            my_character.position.z = collision_tester.z;
        }
        else {
            collision_tester.x = my_character.position.x;
            collision_tester.z = my_character.position.z;
        }
        my_character_position.x = my_character.position.x;
        my_character_position.y = my_character.position.y;
        my_character_position.z = my_character.position.z;
        socket.emit('CharacterPosition', my_character_position);
    }
};

//rendering loop function 설정
function animate() {
    requestAnimationFrame(animate);
    canvas.width = Math.round(dpr * canvas.clientWidth);
    canvas.height = Math.round(dpr * canvas.clientHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (my_character !== undefined) {
        camera.position.z = my_character.position.z + 15;
        camera.position.x = my_character.position.x;
        camera.lookAt(my_character.position.x, my_character.position.y, my_character.position.z);
    }
    renderer.render(scene, camera);
}

animate();

//모델을 불러오기 위한 function
function LoadModel(model_name, x, y, z) {
    const location = "../MapResource/city/" + model_name;
    loader.load(location, (gltf) => {
        gltf.scene.traverse(function (child) {
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        })
        gltf.scene.rotation.y = Math.PI;
        gltf.scene.position.set(x, y, z);
        scene.add(gltf.scene);
        //도로를 제외한 world 모델을 world에 삽입
        if (model_name != "road.glb") {
            const box_helper = new THREE.BoxHelper(gltf.scene, 0xffff00);
            const box3 = new THREE.Box3();
            box3.setFromObject(box_helper);
            const dimensions = new THREE.Vector3().subVectors(box3.max, box3.min);
            const box = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
            const matrix = new THREE.Matrix4().setPosition(dimensions.addVectors(box3.min, box3.max).multiplyScalar(0.5));
            box.applyMatrix4(matrix);
            const mesh = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xffcc55 }));
            mesh.material.side = THREE.DoubleSide;
            world.push(mesh);
        }
    });
}

//온라인 된 계정이 있을시 캐릭터를 그리기 위한 함수
socket.on('OnlineUserCheck', function (data) {
    const id = data.id;
    if (character_container[id] === undefined && id !== document.cookie.split('id=')[1]) {
        const character_json = JSON.parse(data.character_json);
        const character = json_loader.parse(character_json);
        if(data.x === 0){
            character.position.x = data.x + 12.0;
        }
        else{
            character.position.x = data.x;
        }
        if (data.y === 0) {
            character.position.y = data.y + 2.4;
        }
        else {
            character.position.y = data.y;
        }
        character.position.z = data.z;
        ScaleDown(character);
        scene.add(character);
        character_container[id] = character;
    }
    //본인의 캐릭터를 load
    else if (character_container[id] === undefined && my_character === undefined) {
        const character_json = JSON.parse(data.character_json);
        my_character = json_loader.parse(character_json);
        //캐릭터의 중심의 y 좌표가 0이므로 보정, 캐릭터 시작 x축 +12 설정
        my_character.position.x += 12;
        my_character_position.x = my_character.position.x;
        my_character.position.y += 2.4;
        my_character_position.y = my_character.position.y;
        ScaleDown(my_character);
        scene.add(my_character);
    }
});

//오프라인 된 계정이 있을시 캐릭터를 지우기 위한 함수
socket.on('OfflineUserCheck', function (data) {
    const id = data.id;
    const cube = character_container[id];
    scene.remove(cube);
    delete character_container[id];
});

//각 계정의 캐릭터의 변화를 알기 위한 함수
socket.on('UpdateCharacter', function (data) {
    const id = data.id;
    const character = character_container[id];
    character.position.x = data.x;
    character.position.y = data.y;
    character.position.z = data.z;
});

//캐릭터의 크기를 보정해주는 함수
function ScaleDown(character) {
    character.scale.x = 0.1;
    character.scale.y = 0.1;
    character.scale.z = 0.1;
}

//collision을 체크하기 위한 함수 구현, raycaster 응용 + bounding box(AABB)
function CheckCollision() {
    let collision_checker = false;
    const collision_tester_position = new THREE.Vector3(collision_tester.x, collision_tester.y, collision_tester.z);
    for(let collision_vector_index = 0; collision_vector_index < 4; ++collision_vector_index){
        const ray = new THREE.Raycaster(collision_tester_position, collision_vector[collision_vector_index], 0, 0.6);
        const collision_result = ray.intersectObjects(world, false);
        if(collision_result.length !== 0){
            collision_checker = true;
            break;
        }
    }
    return collision_checker;
}