import * as THREE from '/build/three.module.js';
import { GLTFLoader } from '/jsm/loaders/GLTFLoader.js';
const socket = io();

//접속 중인 캐릭터를 담기 위한 배열 및 map
let id_container = [];
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
const intensity = 1;
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

//user가 움직일 수 있는 mesh 생성(temporary)
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x44aa88 });  // greenish blue
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

//본인의 캐릭터 객체 생성
let my_character = {
    id: document.cookie.split('id=')[1],
    x: 0,
    y: 0,
    z: 0
};

//초기 카메라 위치 설정
camera.position.z = cube.position.z + 15;
camera.position.y = 20;
camera.position.x = cube.position.x;
camera.lookAt(cube.position.x, cube.position.y, cube.position.z);

//방향키 입력 이벤트 기입
document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
    let keyCode = event.which;
    // up
    if (keyCode == 38) {
        cube.position.z -= 1;
        // down
    } else if (keyCode == 40) {
        cube.position.z += 1;
        // left
    } else if (keyCode == 37) {
        cube.position.x -= 1;
        // right
    } else if (keyCode == 39) {
        cube.position.x += 1;
    }
    my_character.x = cube.position.x;
    my_character.y = cube.position.y;
    my_character.z = cube.position.z;
    socket.emit('CharacterPosition', my_character);
};

//rendering loop function 설정
function animate() {
    requestAnimationFrame(animate);
    canvas.width = Math.round(dpr * canvas.clientWidth);
    canvas.height = Math.round(dpr * canvas.clientHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = cube.position.z + 15;
    camera.position.x = cube.position.x;
    camera.lookAt(cube.position.x, cube.position.y, cube.position.z);
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
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: data.color });  // greenish blue
        const cube = new THREE.Mesh(geometry, material);
        cube.position.x = data.x;
        cube.position.y = data.y;
        cube.position.z = data.z;
        scene.add(cube);
        character_container[id] = cube;
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