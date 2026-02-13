import * as THREE from 'three';

/**
 * Servicio para convertir datos de geometría IFC a objetos Three.js
 * 
 * Este servicio toma la geometría extraída por web-ifc en el servidor
 * y la convierte en meshes de Three.js para renderizar en el visor 3D.
 */

export interface IfcElement {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  geometry?: {
    vertices: number[];
    indices: number[];
  };
  properties?: Record<string, any>;
}

export interface IfcModel {
  elements: IfcElement[];
  boundingBox?: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
}

/**
 * Colores por tipo de elemento IFC
 */
const IFC_TYPE_COLORS: Record<string, number> = {
  IFCWALL: 0xcccccc,
  IFCWALLSTANDARDCASE: 0xcccccc,
  IFCSLAB: 0x999999,
  IFCROOF: 0x8b4513,
  IFCDOOR: 0x8b4513,
  IFCWINDOW: 0x87ceeb,
  IFCCOLUMN: 0x808080,
  IFCBEAM: 0x808080,
  IFCSTAIR: 0x696969,
  IFCRAILING: 0x4682b4,
  IFCFURNISHINGELEMENT: 0xdaa520,
  IFCSPACE: 0xf0f0f0,
  DEFAULT: 0xaaaaaa,
};

/**
 * Obtiene el color para un tipo de elemento IFC
 */
export function getColorForIfcType(type: string): number {
  return IFC_TYPE_COLORS[type.toUpperCase()] || IFC_TYPE_COLORS.DEFAULT;
}

/**
 * Crea un material Three.js para un tipo de elemento IFC
 */
export function createMaterialForType(type: string, selected: boolean = false): THREE.MeshStandardMaterial {
  const color = getColorForIfcType(type);
  
  return new THREE.MeshStandardMaterial({
    color: selected ? 0xff6b35 : color,
    metalness: 0.1,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
}

/**
 * Convierte datos de geometría IFC a un mesh de Three.js
 */
export function createMeshFromIfcGeometry(element: IfcElement): THREE.Mesh | null {
  if (!element.geometry || !element.geometry.vertices || !element.geometry.indices) {
    return null;
  }

  const { vertices, indices } = element.geometry;

  // Crear geometría Three.js
  const geometry = new THREE.BufferGeometry();
  
  // Convertir array de vértices a Float32Array
  const positions = new Float32Array(vertices);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Establecer índices
  if (indices && indices.length > 0) {
    geometry.setIndex(indices);
  }
  
  // Calcular normales para iluminación correcta
  geometry.computeVertexNormals();
  
  // Crear material basado en el tipo
  const material = createMaterialForType(element.type);
  
  // Crear mesh
  const mesh = new THREE.Mesh(geometry, material);
  
  // Almacenar metadatos del elemento en userData
  mesh.userData = {
    expressId: element.expressId,
    type: element.type,
    globalId: element.globalId,
    name: element.name,
    properties: element.properties,
  };
  
  return mesh;
}

/**
 * Crea un grupo Three.js con todos los elementos del modelo IFC
 */
export function createModelGroup(ifcModel: IfcModel): THREE.Group {
  const group = new THREE.Group();
  group.name = 'IFC Model';
  
  let meshCount = 0;
  
  for (const element of ifcModel.elements) {
    const mesh = createMeshFromIfcGeometry(element);
    if (mesh) {
      group.add(mesh);
      meshCount++;
    }
  }
  
  console.log(`Created ${meshCount} meshes from ${ifcModel.elements.length} elements`);
  
  return group;
}

/**
 * Calcula el bounding box de un modelo
 */
export function calculateBoundingBox(group: THREE.Group): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromObject(group);
  return box;
}

/**
 * Centra la cámara en el modelo
 */
export function centerCameraOnModel(
  camera: THREE.PerspectiveCamera,
  group: THREE.Group,
  controls?: any
): void {
  const box = calculateBoundingBox(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  // Calcular distancia óptima de la cámara
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  
  // Añadir margen
  cameraZ *= 1.5;
  
  // Posicionar cámara
  camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
  camera.lookAt(center);
  
  // Actualizar controles si existen
  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

/**
 * Crea un modelo simplificado de ejemplo (para testing sin archivo IFC)
 */
export function createDemoModel(): IfcModel {
  const elements: IfcElement[] = [
    {
      expressId: 1,
      type: 'IFCWALL',
      name: 'Wall Demo',
      geometry: {
        vertices: [
          -5, 0, 0,  5, 0, 0,  5, 3, 0,  -5, 3, 0,  // Front face
          -5, 0, -0.3,  5, 0, -0.3,  5, 3, -0.3,  -5, 3, -0.3,  // Back face
        ],
        indices: [
          0, 1, 2,  0, 2, 3,  // Front
          4, 6, 5,  4, 7, 6,  // Back
          0, 4, 7,  0, 7, 3,  // Left
          1, 5, 6,  1, 6, 2,  // Right
          3, 2, 6,  3, 6, 7,  // Top
          0, 5, 1,  0, 4, 5,  // Bottom
        ],
      },
    },
    {
      expressId: 2,
      type: 'IFCSLAB',
      name: 'Floor Demo',
      geometry: {
        vertices: [
          -6, 0, -6,  6, 0, -6,  6, 0, 6,  -6, 0, 6,
          -6, -0.3, -6,  6, -0.3, -6,  6, -0.3, 6,  -6, -0.3, 6,
        ],
        indices: [
          0, 1, 2,  0, 2, 3,  // Top
          4, 6, 5,  4, 7, 6,  // Bottom
        ],
      },
    },
  ];
  
  return { elements };
}
