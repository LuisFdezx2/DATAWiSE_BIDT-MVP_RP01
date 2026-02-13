# Digital Twin Viewer - User Guide

**Version**: 1.0.0
**Last Updated**: February 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Navigation Controls](#navigation-controls)
4. [Viewing Models](#viewing-models)
5. [Element Selection](#element-selection)
6. [Real-Time IoT Data](#real-time-iot-data)
7. [Measurements](#measurements)
8. [Model Comparison](#model-comparison)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The Digital Twin Viewer provides interactive 3D visualisation of BIM models with real-time IoT sensor data integration. It is built on React Three Fiber and Three.js (v0.181), enabling inspection and analysis of building models with live operational data overlays.

### Key Features

- High-performance 3D rendering with WebGL via React Three Fiber
- Real-time sensor data visualisation (temperature, humidity, occupancy, energy, CO2, light)
- Element inspection with IFC properties, COBie data, and bSDD classifications
- Measurement tools for distances and areas
- Model version comparison and multi-model comparison
- Level of Detail (LOD) for large models
- Comment and annotation system per element

---

## Getting Started

### Loading a Model

1. Navigate to **Digital Twin Viewer** from the Dashboard
2. Select a project from the dropdown
3. Choose an IFC model to visualise
4. Click **"Load Model"**
5. Wait for the model to load (a progress bar indicates status)

### First View

When the model loads:

- The model appears in 3D space
- The camera centres on the model
- Navigation controls become active
- The element count displays in the interface

---

## Navigation Controls

### Mouse Controls

- **Left Click + Drag**: Rotate camera around model
- **Right Click + Drag**: Pan camera (move view)
- **Scroll Wheel**: Zoom in/out
- **Double Click**: Focus on element

### Keyboard Controls

- **Arrow Keys**: Pan camera
- **+/-**: Zoom in/out
- **Home**: Reset camera to default view
- **F**: Focus on selected element
- **Esc**: Deselect element

### Touch Controls (Mobile/Tablet)

- **One Finger Drag**: Rotate camera
- **Two Finger Drag**: Pan camera
- **Pinch**: Zoom in/out
- **Double Tap**: Focus on element

---

## Viewing Models

### View Modes

#### Shaded View (Default)

- Full colour rendering
- Realistic materials
- Shadows enabled

#### Wireframe View

- Shows element edges
- Useful for complex geometries
- Better performance

#### X-Ray View

- Semi-transparent elements
- See through walls
- Inspect hidden elements

### Changing View Mode

1. Click the **"View Mode"** button in the toolbar
2. Select the desired mode
3. The view updates immediately

---

## Element Selection

### Selecting Elements

- **Click** on any element to select it
- The selected element highlights in blue
- The properties panel opens on the right

### Properties Panel

The properties panel displays the following for a selected element:

- **Element Type**: IFC class (IfcWall, IfcDoor, IfcWindow, etc.)
- **GUID**: Unique IFC identifier
- **Name**: Element name
- **IFC Properties**: All property sets extracted from the IFC file
- **COBie Data**: Linked COBie component information (if available)
- **bSDD Mapping**: Semantic classification from buildingSMART Data Dictionary
- **Sensor Data**: Real-time IoT readings (if sensors are attached)
- **Comments**: Annotations added by team members

### Multi-Selection

- **Ctrl/Cmd + Click**: Add element to selection
- **Shift + Click**: Select range
- **Ctrl/Cmd + A**: Select all visible elements

### Filtering Elements

1. Click the **"Filter"** button
2. Choose IFC type (Walls, Doors, Windows, etc.)
3. Only the selected types remain visible
4. Click **"Clear Filter"** to show all elements

---

## Real-Time IoT Data

### Viewing Sensor Data

Elements with attached sensors display:

- **Colour overlay** indicating status (green = normal, yellow = warning, red = critical)
- **Pulsing animation** for critical alerts
- **Data tooltip** on hover showing the current value and unit

### Supported Sensor Types

| Sensor Type | Unit | Description |
| ----------- | ---- | ----------- |
| Temperature | °C | Ambient temperature |
| Humidity | %RH | Relative humidity |
| Occupancy | count | Number of people detected |
| Energy | kWh | Energy consumption |
| CO2 | ppm | Carbon dioxide concentration |
| Light | lux | Light level |

### Historical Data

1. Select an element with an attached sensor
2. Click **"View History"** in the properties panel
3. A graph shows readings over time
4. Adjust the time range (1 hour, 24 hours, 7 days, 30 days)

### Sensor Management

For detailed sensor configuration, including connection settings (HTTP, MQTT, Simulator), alert thresholds, and health monitoring, navigate to the **Sensor Management** page from the Dashboard.

---

## Measurements

### Distance Measurement

1. Click the **"Measure Distance"** tool
2. Click the first point
3. Click the second point
4. The distance displays in metres
5. Press **Esc** to exit measurement mode

### Area Measurement

1. Click the **"Measure Area"** tool
2. Click points to define a polygon
3. Double-click to close the polygon
4. The area displays in square metres
5. Press **Esc** to cancel

### Volume Measurement

1. Select an element
2. The volume shows in the properties panel
3. It is calculated from the element geometry

---

## Model Comparison

### Two-Model Comparison

1. Navigate to **Model Comparison** from the Dashboard
2. Select a project
3. Choose two models (or two versions of the same model)
4. The system highlights added, removed, and modified elements
5. Critical structural changes are flagged automatically

### Multi-Model Comparison

1. Navigate to **Multi-Model Comparison**
2. Select up to 10 model versions
3. View a timeline of changes with a heatmap visualisation
4. Identify trends across versions

---

## Performance Optimization

### Level of Detail (LOD)

The viewer automatically adjusts detail based on:

- **Distance to camera**: Far objects use lower detail
- **Element count**: Large models use aggressive LOD
- **Frame rate**: Adapts to maintain 60 FPS

### LOD Levels

| Level | Detail | Distance |
| ----- | ------ | -------- |
| High | Full geometry | < 50 m from camera |
| Medium | Simplified geometry | 50-150 m |
| Low | Bounding box | 150-300 m |
| Hidden | Not rendered | > 300 m |

### Performance Settings

Access via **"Settings"** > **"Performance"**:

- **LOD Distance**: Adjust LOD thresholds
- **Shadow Quality**: Low / Medium / High
- **Antialiasing**: On / Off
- **Ambient Occlusion**: On / Off

---

## Troubleshooting

### Model Will Not Load

**Problem**: Model loading fails

**Solution**:

- Check that the IFC file is valid
- Verify the file size (under 100 MB recommended)
- Try refreshing the page
- Check the browser console for errors

### Poor Performance

**Problem**: Viewer is slow or laggy

**Solution**:

- Enable LOD in settings
- Reduce shadow quality
- Disable antialiasing
- Close other browser tabs
- Use a browser with hardware acceleration enabled

### Elements Not Visible

**Problem**: Some elements do not appear

**Solution**:

- Check filter settings (elements may be filtered out)
- Verify the element has geometry data
- Zoom out to see the full model
- Check that no section plane is active

### Sensor Data Not Showing

**Problem**: No real-time data overlays

**Solution**:

- Verify sensors are configured in the Sensor Management page
- Check sensor status (must be "active")
- Ensure the element has a sensor attached
- Click **"Refresh Data"** to update

---

## Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |
| **F** | Focus on selected element |
| **H** | Hide selected element |
| **Shift + H** | Hide unselected elements |
| **Alt + H** | Show all hidden elements |
| **I** | Isolate selected element |
| **Esc** | Deselect / Cancel operation |
| **Ctrl/Cmd + F** | Search elements |
| **Space** | Toggle orbit/pan mode |

---

**DATAWiSE BIM Digital Twin Platform**
Copyright 2026 DATAWiSE. All rights reserved.
