import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createModelGroup,
  centerCameraOnModel,
  createDemoModel,
  type IfcModel,
  type IfcElement,
} from '@/services/ifcGeometryLoader';
import type { ElementChange } from '@/contexts/ComparisonContext';

interface MeasurementPoint {
  x: number;
  y: number;
  z: number;
}

interface Measurement {
  id: string;
  start: MeasurementPoint;
  end: MeasurementPoint;
  distance: number;
}

interface ThreeViewerProps {
  model?: IfcModel;
  onElementSelected?: (element: IfcElement | null) => void;
  visibleTypes?: Set<string>;
  className?: string;
  measurementMode?: boolean;
  onMeasurementComplete?: (measurement: Measurement) => void;
  clearMeasurements?: boolean;
  comparisonMode?: boolean;
  comparisonChanges?: {
    added: ElementChange[];
    removed: ElementChange[];
    modified: ElementChange[];
  };
  comparisonFilters?: {
    showAdded: boolean;
    showRemoved: boolean;
    showModified: boolean;
  };
  onScreenshotReady?: (dataUrl: string) => void;
  captureScreenshot?: boolean;
  highlightedNodeId?: string | null;
}

export type { MeasurementPoint, Measurement };

export function ThreeViewer({ 
  model, 
  onElementSelected, 
  visibleTypes, 
  className,
  measurementMode = false,
  onMeasurementComplete,
  clearMeasurements = false,
  comparisonMode = false,
  comparisonChanges,
  highlightedNodeId = null,
  comparisonFilters,
  onScreenshotReady,
  captureScreenshot = false
}: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const [selectedMesh, setSelectedMesh] = useState<THREE.Mesh | null>(null);
  const measurementPointsRef = useRef<MeasurementPoint[]>([]);
  const measurementGroupRef = useRef<THREE.Group | null>(null);

  // Inicializar escena Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Crear escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Crear cámara
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Crear renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Crear controles de órbita
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    // Añadir luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Añadir grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0xcccccc, 0xeeeeee);
    scene.add(gridHelper);

    // Añadir axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Crear grupo para mediciones
    const measurementGroup = new THREE.Group();
    scene.add(measurementGroup);
    measurementGroupRef.current = measurementGroup;

    // Loop de animación
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Manejar resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Cargar modelo cuando cambia
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Remover modelo anterior si existe
    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      modelGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    // Cargar nuevo modelo (o demo si no hay modelo)
    const modelToLoad = model || createDemoModel();
    const modelGroup = createModelGroup(modelToLoad);
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Centrar cámara en el modelo
    centerCameraOnModel(camera, modelGroup, controls);
  }, [model]);

  // Aplicar colores de comparación cuando está en modo comparación
  useEffect(() => {
    if (!modelGroupRef.current || !comparisonMode || !comparisonChanges) return;

    // Crear mapas de cambios por expressId
    const addedMap = new Map<number, ElementChange>();
    const removedMap = new Map<number, ElementChange>();
    const modifiedMap = new Map<number, ElementChange>();

    comparisonChanges.added.forEach(change => addedMap.set(change.expressId, change));
    comparisonChanges.removed.forEach(change => removedMap.set(change.expressId, change));
    comparisonChanges.modified.forEach(change => modifiedMap.set(change.expressId, change));

    // Aplicar colores a los meshes
    modelGroupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.expressId !== undefined) {
        const expressId = child.userData.expressId;
        
        // Colores de comparación
        if (addedMap.has(expressId)) {
          // Verde para elementos añadidos
          (child.material as THREE.MeshStandardMaterial).color.setHex(0x4ade80);
          (child.material as THREE.MeshStandardMaterial).emissive.setHex(0x166534);
        } else if (removedMap.has(expressId)) {
          // Rojo para elementos eliminados
          (child.material as THREE.MeshStandardMaterial).color.setHex(0xef4444);
          (child.material as THREE.MeshStandardMaterial).emissive.setHex(0x7f1d1d);
        } else if (modifiedMap.has(expressId)) {
          // Amarillo para elementos modificados
          (child.material as THREE.MeshStandardMaterial).color.setHex(0xfbbf24);
          (child.material as THREE.MeshStandardMaterial).emissive.setHex(0x78350f);
        }
      }
    });
  }, [comparisonMode, comparisonChanges]);

  // Aplicar filtros de visibilidad en modo comparación
  useEffect(() => {
    if (!modelGroupRef.current || !comparisonMode || !comparisonChanges || !comparisonFilters) return;

    // Crear mapas de cambios por expressId
    const addedMap = new Map<number, ElementChange>();
    const removedMap = new Map<number, ElementChange>();
    const modifiedMap = new Map<number, ElementChange>();

    comparisonChanges.added.forEach(change => addedMap.set(change.expressId, change));
    comparisonChanges.removed.forEach(change => removedMap.set(change.expressId, change));
    comparisonChanges.modified.forEach(change => modifiedMap.set(change.expressId, change));

    // Aplicar visibilidad según filtros
    modelGroupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.expressId !== undefined) {
        const expressId = child.userData.expressId;
        
        // Determinar visibilidad según tipo de cambio y filtros activos
        if (addedMap.has(expressId)) {
          child.visible = comparisonFilters.showAdded;
        } else if (removedMap.has(expressId)) {
          child.visible = comparisonFilters.showRemoved;
        } else if (modifiedMap.has(expressId)) {
          child.visible = comparisonFilters.showModified;
        }
        // Elementos sin cambios siempre visibles
      }
    });
  }, [comparisonMode, comparisonChanges, comparisonFilters]);

  // Resaltar elemento desde URL (Knowledge Graph navigation)
  useEffect(() => {
    if (!modelGroupRef.current || !highlightedNodeId) return;

    modelGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData) {
        const element = child.userData as IfcElement;
        const nodeId = `exp_${element.expressId}`;

        if (nodeId === highlightedNodeId || element.globalId === highlightedNodeId) {
          // Resaltar con color naranja brillante
          (child.material as THREE.MeshStandardMaterial).emissive.setHex(0xff6b35);
          (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
          
          // Seleccionar automáticamente
          setSelectedMesh(child);
          if (onElementSelected) {
            onElementSelected(element);
          }
        }
      }
    });
  }, [highlightedNodeId, onElementSelected]);

  // Actualizar visibilidad de elementos cuando cambia visibleTypes
  useEffect(() => {
    if (!modelGroupRef.current) return;

    modelGroupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.type) {
        const elementType = child.userData.type;
        
        // Si no hay filtro de visibilidad, mostrar todo
        if (!visibleTypes) {
          child.visible = true;
        } else {
          // Mostrar solo si el tipo está en el conjunto de tipos visibles
          child.visible = visibleTypes.has(elementType);
        }
      }
    });
  }, [visibleTypes]);

  // Manejar selección de elementos con raycasting
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !modelGroupRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(modelGroupRef.current.children, true);

    if (intersects.length > 0) {
      const intersectionPoint = intersects[0].point;

      // Modo de medición
      if (measurementMode) {
        const point: MeasurementPoint = {
          x: intersectionPoint.x,
          y: intersectionPoint.y,
          z: intersectionPoint.z,
        };

        measurementPointsRef.current.push(point);

        // Si tenemos dos puntos, calcular distancia
        if (measurementPointsRef.current.length === 2) {
          const [start, end] = measurementPointsRef.current;
          const distance = Math.sqrt(
            Math.pow(end.x - start.x, 2) +
            Math.pow(end.y - start.y, 2) +
            Math.pow(end.z - start.z, 2)
          );

          const measurement: Measurement = {
            id: `measurement-${Date.now()}`,
            start,
            end,
            distance,
          };

          // Crear línea visual
          if (measurementGroupRef.current) {
            const points = [
              new THREE.Vector3(start.x, start.y, start.z),
              new THREE.Vector3(end.x, end.y, end.z),
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const lineMaterial = new THREE.LineBasicMaterial({ 
              color: 0x7fb069, 
              linewidth: 2 
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData.measurementId = measurement.id;
            measurementGroupRef.current.add(line);

            // Crear esferas en los puntos
            const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
            const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x7fb069 });
            
            const startSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            startSphere.position.set(start.x, start.y, start.z);
            startSphere.userData.measurementId = measurement.id;
            measurementGroupRef.current.add(startSphere);

            const endSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            endSphere.position.set(end.x, end.y, end.z);
            endSphere.userData.measurementId = measurement.id;
            measurementGroupRef.current.add(endSphere);
          }

          if (onMeasurementComplete) {
            onMeasurementComplete(measurement);
          }

          // Limpiar puntos para la siguiente medición
          measurementPointsRef.current = [];
        }
        return;
      }

      // Modo de selección normal
      const mesh = intersects[0].object as THREE.Mesh;
      
      // Deseleccionar mesh anterior
      if (selectedMesh && selectedMesh !== mesh) {
        const material = selectedMesh.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0x000000);
      }

      // Seleccionar nuevo mesh
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(0xff6b35);
      material.emissiveIntensity = 0.3;
      setSelectedMesh(mesh);

      // Notificar al componente padre
      if (onElementSelected && mesh.userData) {
        onElementSelected(mesh.userData as IfcElement);
      }
    } else {
      // Deseleccionar si se hace clic en el vacío
      if (selectedMesh) {
        const material = selectedMesh.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0x000000);
        setSelectedMesh(null);
      }
      if (onElementSelected) {
        onElementSelected(null);
      }
    }
  };

  // Limpiar mediciones cuando se solicita
  useEffect(() => {
    if (clearMeasurements && measurementGroupRef.current) {
      // Limpiar todos los objetos del grupo de mediciones
      while (measurementGroupRef.current.children.length > 0) {
        const child = measurementGroupRef.current.children[0];
        measurementGroupRef.current.remove(child);
        
        // Liberar geometrías y materiales
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
      measurementPointsRef.current = [];
    }
  }, [clearMeasurements]);

  // Capturar screenshot cuando se solicite
  useEffect(() => {
    if (captureScreenshot && rendererRef.current && onScreenshotReady) {
      // Renderizar una vez más para asegurar que todo esté actualizado
      if (sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Capturar el canvas como imagen base64
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png', 1.0);
      onScreenshotReady(dataUrl);
    }
  }, [captureScreenshot, onScreenshotReady]);

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={handleClick}
      style={{ cursor: measurementMode ? 'crosshair' : 'pointer' }}
    />
  );
}
