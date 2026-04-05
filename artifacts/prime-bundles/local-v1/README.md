# InfraResolutionBench Prime Bundle Export

This directory packages the local benchmark into a Prime-oriented artifact bundle.

Contents:
- environment_contract.json: prompt modes, tool definitions, protocol version, and output fields
- dataset_manifest.json: case indexes for gold and synthetic datasets
- sources.json: local source directories used to build the bundle
- data/: copied gold and synthetic case files
- artifacts/: copied run summaries and protocol artifacts
- docs/: copied benchmark and integration documentation

Notes:
- This export does not call Prime directly.
- It creates a stable handoff artifact for future Prime environment packaging and hosted eval setup.
- Scoring remains deterministic and local-first in this repo.
