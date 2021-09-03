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

//방향키 입력 이벤트 기입
document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
    if (my_character !== undefined) {
        let keyCode = event.which;
        // up
        if (keyCode == 38) {
            my_character.position.z -= 1;
            // down
        } else if (keyCode == 40) {
            my_character.position.z += 1;
            // left
        } else if (keyCode == 37) {
            my_character.position.x -= 1;
            // right
        } else if (keyCode == 39) {
            my_character.position.x += 1;
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
                child.receiveShadow = true
                child.castShadow = true
            }
        })
        gltf.scene.rotation.y = Math.PI;
        gltf.scene.position.set(x, y, z)
        scene.add(gltf.scene)
    })

}

//온라인 된 계정이 있을시 캐릭터를 그리기 위한 함수
socket.on('OnlineUserCheck', function (data) {
    const id = data.id;
    if (character_container[id] === undefined && id !== document.cookie.split('id=')[1]) {
        const character_json = JSON.parse(data.character_json);
        const character = json_loader.parse(character_json);
        character.position.x = data.x;
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
        //캐릭터의 중심의 y 좌표가 0이므로 보정
        my_character.position.y += 2.4;
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