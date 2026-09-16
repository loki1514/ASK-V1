"""Verify the pinned ASK speaker-model artifact without network access."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "models" / "voxceleb_ECAPA512.manifest.json"


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    model_path = MANIFEST_PATH.parent / manifest["file"]
    actual = hashlib.sha256(model_path.read_bytes()).hexdigest()
    expected = manifest["sha256"]
    if actual != expected:
        raise SystemExit(f"SHA-256 mismatch: expected {expected}, received {actual}")
    print(f"verified {model_path.name}: {actual}")

    try:
        import onnx  # type: ignore
    except ImportError:
        return

    model = onnx.load(str(model_path), load_external_data=False)
    opsets = [item.version for item in model.opset_import]
    if manifest["opset"] not in opsets:
        raise SystemExit(f"Expected opset {manifest['opset']}; received {opsets}")
    input_names = [item.name for item in model.graph.input]
    output_names = [item.name for item in model.graph.output]
    if manifest["inputName"] not in input_names or manifest["outputName"] not in output_names:
        raise SystemExit(f"Tensor contract mismatch: inputs={input_names}, outputs={output_names}")
    print(f"verified tensor names and opset {manifest['opset']}")


if __name__ == "__main__":
    main()
