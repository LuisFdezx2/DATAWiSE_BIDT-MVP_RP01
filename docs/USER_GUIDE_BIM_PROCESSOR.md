# BIM Data Processor - User Guide

**Version**: 1.0.0
**Last Updated**: February 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Creating Workflows](#creating-workflows)
4. [Available Nodes](#available-nodes)
5. [Executing Workflows](#executing-workflows)
6. [Viewing Results](#viewing-results)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

The BIM Data Processor is a visual workflow tool for processing IFC files, validating models against buildingSMART standards, and enriching BIM data with semantic information. It uses a node-based interface where you drag and drop processing steps to create custom data pipelines.

### Key Features

- Visual workflow creation with drag-and-drop node editor (React Flow)
- IFC file processing and element extraction (via web-ifc)
- IDS validation against buildingSMART Information Delivery Specifications
- Semantic enrichment with bSDD (buildingSMART Data Dictionary)
- Knowledge graph construction in Neo4j
- Data quality scoring for model assessment
- Export to CSV and JSON formats
- PDF and JSON report generation

---

## Getting Started

### Accessing the BIM Data Processor

1. Navigate to the Dashboard
2. Click on the **"BIM Data Processor"** card
3. The workflow canvas opens with a sidebar of available nodes

### Interface Overview

- **Left Sidebar**: Available processing nodes organised by category (Input, Processing, Output)
- **Centre Canvas**: Workspace for building workflows using React Flow
- **Top Toolbar**: Run button, save/load options, zoom controls
- **Bottom Panel**: Execution logs and results

---

## Creating Workflows

### Step 1: Add an Input Node

Every workflow starts with an **IFC Loader** input node:

1. Drag the **"IFC Loader"** node from the Input section
2. Drop it onto the canvas
3. Click the node to configure:
   - Select an existing IFC model from your project
   - Or upload a new IFC file

### Step 2: Add Processing Nodes

Add processing steps by dragging nodes from the Processing section. Connect them in sequence to build your pipeline:

- **Filter by Class**: Keep or exclude specific IFC types (IfcWall, IfcDoor, etc.)
- **Filter by Property**: Filter elements based on property values
- **IDS Validator**: Validate against IDS specifications
- **bSDD Mapper**: Map elements to bSDD classifications
- **Graph Builder**: Create knowledge graph relationships in Neo4j
- **Quality Score**: Calculate data quality metrics (0-100)

### Step 3: Connect Nodes

1. Click the output port (right side) of a node
2. Drag to the input port (left side) of the next node
3. Release to create the connection
4. The connection line shows data flow direction

### Step 4: Add an Output Node

Finish your workflow with an output node:

- **Export CSV**: Export results to CSV format
- **Export JSON**: Export results to JSON format

### Example Workflow

```text
IFC Loader → Filter by Class → IDS Validator → Quality Score → Export JSON
```

This workflow:

1. Loads an IFC file
2. Filters for specific element types (e.g., walls and doors)
3. Validates the filtered elements against an IDS specification
4. Calculates a data quality score
5. Exports the results to JSON

---

## Available Nodes

### Input Nodes

#### IFC Loader (`ifc-loader`)

- **Purpose**: Load an IFC model into the workflow pipeline
- **Configuration**: Select an existing model from the project or upload a new file
- **Output**: Complete list of IFC elements with properties

This is the only input node type. Every workflow must start with at least one IFC Loader. Multiple loaders can be used in a single workflow to process data from different models.

### Processing Nodes

#### Filter by Class (`filter-class`)

- **Purpose**: Filter IFC elements by their classification type
- **Configuration**:
  - **Classes**: Select one or more IFC types (IfcWall, IfcDoor, IfcWindow, IfcSlab, IfcBeam, IfcColumn, etc.)
  - **Operator**: `include` (keep only selected types) or `exclude` (remove selected types)
- **Input**: Element list
- **Output**: Filtered element list

#### Filter by Property (`filter-property`)

- **Purpose**: Filter elements based on property values
- **Configuration**:
  - **Property Name**: The property key to filter on
  - **Operator**: `equals`, `contains`, `greaterThan`, or `lessThan`
  - **Value**: The value to compare against
- **Input**: Element list
- **Output**: Filtered element list

String comparisons are case-insensitive. Multiple filter nodes can be chained for complex queries.

#### IDS Validator (`ids-validator`)

- **Purpose**: Validate IFC elements against buildingSMART Information Delivery Specification (IDS) rules
- **Configuration**:
  - **IDS Template**: Select a predefined template or upload a custom IDS XML file
  - **Strict Mode**: When enabled, the workflow fails if any element violates the specification
  - **Report Details**: Include detailed error messages per element
- **Input**: Element list
- **Output**: Validation results with pass/fail status per element

The IDS templates are organised by category:

| Category | Description |
| --------------------------- | -------------------------------------- |
| Building Codes | National building code requirements |
| ISO Standards | ISO standard compliance checks |
| Industry Best Practices | Common data quality requirements |
| Custom | User-defined specifications |

#### bSDD Mapper (`bsdd-mapper`)

- **Purpose**: Map IFC elements to bSDD (buildingSMART Data Dictionary) classifications
- **Configuration**:
  - **Target Library**: bSDD domain to map against (IFC, Uniclass, etc.)
  - **Confidence Threshold**: Minimum match confidence (0-100)
  - **Auto-Apply**: Automatically apply the top match
- **Input**: Element list
- **Output**: Elements enriched with bSDD classification references

Mappings are cached for performance. Results are stored in the `bsddClassifications` field of each element.

#### Graph Builder (`graph-builder`)

- **Purpose**: Build a semantic knowledge graph from IFC element relationships in Neo4j
- **Configuration**:
  - **Relationship Types**: Which relationships to map (spatial, type, part-of)
  - **Include Properties**: Store element properties as graph node attributes
  - **Create Indexes**: Optimise Neo4j queries
- **Input**: Element list (ideally enriched with bSDD data)
- **Output**: Graph nodes and relationships stored in Neo4j

Requires a running Neo4j instance. The graph can be explored in the Knowledge Graph page.

#### Quality Score (`quality-score`)

- **Purpose**: Calculate a data quality score for the IFC model (0-100)
- **Configuration**:
  - **Completeness**: Weight for property coverage
  - **Consistency**: Weight for data consistency
  - **Accuracy**: Weight for conformance to the IFC schema
  - **Semantics**: Weight for semantic richness (bSDD enrichment)
- **Input**: Element list
- **Output**: Weighted quality score with per-element breakdown

Elements with missing required properties, inconsistent data, or no semantic enrichment receive lower scores. The overall score is stored in the model record.

### Output Nodes

#### Export CSV (`export-csv`)

- **Purpose**: Export workflow results as a CSV file
- **Configuration**:
  - **Columns**: Select which fields to include
  - **Delimiter**: Comma (`,`) or semicolon (`;`)
  - **Include Headers**: Add column headers row
  - **File Name**: Custom output file name
- **Input**: Workflow results
- **Output**: Downloadable CSV file

Nested properties are flattened. Quality scores and validation results are included as columns.

#### Export JSON (`export-json`)

- **Purpose**: Export workflow results as a JSON file
- **Configuration**:
  - **Structure**: `flat`, `nested`, or `hierarchical`
  - **Include Metadata**: Add workflow execution metadata
  - **Pretty Print**: Format output for readability
  - **File Name**: Custom output file name
- **Input**: Workflow results
- **Output**: Downloadable JSON file

Preserves the full data structure including nested properties and relationships.

---

## Executing Workflows

### Running a Workflow

1. **Validate**: Ensure all nodes are connected properly
   - Red nodes indicate missing configuration
   - Unconnected non-input nodes cannot execute

2. **Click Run**: Press the **"Run"** button in the top toolbar

3. **Monitor Progress**: Watch the execution in the bottom panel
   - Each node shows its execution status (pending, running, completed, error)
   - Logs display in real time

4. **View Results**: Results appear when execution completes
   - Green checkmark: Success
   - Red indicator: Error with message

### Execution Details

The workflow engine performs the following steps:

1. **Validation**: Checks that all nodes are connected and no circular dependencies exist
2. **Topological Sort**: Determines the correct execution order based on node dependencies
3. **Sequential Execution**: Runs each node in order, passing data between connected nodes
4. **Result Storage**: Saves the execution record with logs, duration, and results

### Saving Workflows

1. Click **"Save Workflow"** in the toolbar
2. Enter a workflow name and optional description
3. The workflow is saved to your project
4. Load saved workflows from the workflows list at any time

Custom workflows are saved per user and can be managed independently of project workflows.

---

## Viewing Results

### Execution Logs

The bottom panel displays:

- Execution start time
- Node-by-node progress and status
- Warnings and errors
- Total execution time

### Results Panel

After execution completes:

- **Statistics**: Element counts by type, processing time
- **Validation Results**: IDS compliance rate and per-specification details
- **Quality Scores**: Overall score and per-criteria breakdown
- **Export Options**: Download CSV or JSON output files

### Generating Reports

1. After successful execution, click **"Generate Report"**
2. Select report format:
   - **PDF**: Formatted report with charts and tables
   - **JSON**: Structured data for external processing
3. The report includes:
   - Workflow summary and configuration
   - Execution statistics
   - Validation results and compliance rates
   - Quality scores
   - Detailed execution logs

---

## Best Practices

### Workflow Design

1. **Start Simple**: Begin with a basic pipeline (load, filter, export) and add steps gradually
2. **Filter Early**: Place filter nodes near the beginning to reduce the dataset size for downstream processing
3. **Validate Before Enrichment**: Run IDS validation before bSDD mapping to catch data issues early
4. **Document Workflows**: Add clear names and descriptions to help team members understand the purpose

### Performance Tips

1. **Reduce Dataset Early**: Filtering elements at the start significantly improves performance
2. **Avoid Circular Connections**: The engine detects and rejects circular dependencies
3. **Test with Small Models**: Validate your workflow on a small IFC file before processing large models
4. **Use bSDD Caching**: The bSDD mapper caches API responses; subsequent runs on similar data are faster

---

## Troubleshooting

### Common Issues

#### Workflow Will Not Run

**Problem**: The Run button is disabled or the workflow fails to start.

**Solution**:

- Ensure all nodes are properly configured (no red indicators)
- Check that all non-input nodes are connected to at least one upstream node
- Verify an IFC model is selected in the IFC Loader node

#### Execution Fails at a Node

**Problem**: A node shows an error during execution.

**Solution**:

- Check the execution logs in the bottom panel for the error message
- For IDS Validator errors: ensure the IDS specification matches the model schema (IFC2X3 vs IFC4)
- For bSDD Mapper errors: verify the network connection (the bSDD API is external)
- For Graph Builder errors: confirm that Neo4j is running and accessible

#### Slow Performance

**Problem**: The workflow takes too long to complete.

**Solution**:

- Add a Filter by Class node before processing nodes to reduce the element count
- For large models (10,000+ elements), consider filtering to specific element types
- Check that the bSDD cache is active (`bsdd.getCacheStats` in the API)

#### Export Files Are Empty

**Problem**: The CSV or JSON export contains no data.

**Solution**:

- Verify that upstream nodes produced results (check the logs)
- Ensure the output node is connected to a node that outputs data
- Check that filters have not excluded all elements

### Getting Help

If you encounter issues:

1. **Check Logs**: Review the execution logs in the bottom panel for detailed error messages
2. **Documentation**: Consult this guide and the [API Documentation](API_DOCUMENTATION.md)
3. **Support**: Contact <support@datawise.eu>

---

## Keyboard Shortcuts

| Shortcut | Action |
| -------------- | -------------------------------- |
| **Ctrl/Cmd + S** | Save workflow |
| **Ctrl/Cmd + Z** | Undo |
| **Ctrl/Cmd + Y** | Redo |
| **Delete** | Delete selected node |
| **Ctrl/Cmd + A** | Select all nodes |

---

**DATAWiSE BIM Digital Twin Platform**
Copyright 2026 DATAWiSE. All rights reserved.
