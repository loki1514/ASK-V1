#!/usr/bin/env python3
"""Calibrate a versioned speaker-verification threshold from labeled cosine scores."""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class Rates:
    threshold: float
    false_accept_rate: float
    false_reject_rate: float
    detection_cost: float


def rates_at_threshold(
    target_scores: list[float],
    impostor_scores: list[float],
    threshold: float,
    false_reject_cost: float,
    false_accept_cost: float,
    target_prior: float,
) -> Rates:
    false_reject_rate = sum(score < threshold for score in target_scores) / len(target_scores)
    false_accept_rate = sum(score >= threshold for score in impostor_scores) / len(impostor_scores)
    detection_cost = (
        false_reject_cost * false_reject_rate * target_prior
        + false_accept_cost * false_accept_rate * (1.0 - target_prior)
    )
    return Rates(threshold, false_accept_rate, false_reject_rate, detection_cost)


def calibrate(
    target_scores: list[float],
    impostor_scores: list[float],
    false_reject_cost: float = 1.0,
    false_accept_cost: float = 10.0,
    target_prior: float = 0.5,
) -> tuple[Rates, Rates]:
    if not target_scores or not impostor_scores:
        raise ValueError("Calibration requires target and impostor trials")
    if not 0.0 < target_prior < 1.0:
        raise ValueError("target_prior must be between zero and one")

    unique_scores = sorted(set(target_scores + impostor_scores))
    epsilon = 1e-6
    thresholds = [unique_scores[0] - epsilon, *unique_scores, unique_scores[-1] + epsilon]
    rates = [
        rates_at_threshold(
            target_scores,
            impostor_scores,
            threshold,
            false_reject_cost,
            false_accept_cost,
            target_prior,
        )
        for threshold in thresholds
    ]
    eer = min(rates, key=lambda item: (abs(item.false_accept_rate - item.false_reject_rate), item.threshold))
    min_dcf = min(rates, key=lambda item: (item.detection_cost, item.threshold))
    return eer, min_dcf


def read_scores(path: Path) -> tuple[list[float], list[float]]:
    target_scores: list[float] = []
    impostor_scores: list[float] = []
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            label = row["label"].strip().lower()
            score = float(row["score"])
            if label == "target":
                target_scores.append(score)
            elif label == "impostor":
                impostor_scores.append(score)
            else:
                raise ValueError(f"Unsupported label: {label}")
    return target_scores, impostor_scores


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("scores", type=Path, help="CSV with label,target|impostor and score columns")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--profile-id", required=True)
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--preprocessing-version", required=True)
    parser.add_argument("--evaluation-set-id", required=True)
    parser.add_argument("--platform", choices=("ios", "android", "cross_platform"), default="cross_platform")
    parser.add_argument("--false-reject-cost", type=float, default=1.0)
    parser.add_argument("--false-accept-cost", type=float, default=10.0)
    parser.add_argument("--target-prior", type=float, default=0.5)
    parser.add_argument("--ambiguity-margin", type=float, default=0.04)
    parser.add_argument("--method", choices=("eer", "min_dcf"), default="min_dcf")
    args = parser.parse_args()

    target_scores, impostor_scores = read_scores(args.scores)
    eer, min_dcf = calibrate(
        target_scores,
        impostor_scores,
        args.false_reject_cost,
        args.false_accept_cost,
        args.target_prior,
    )
    selected = eer if args.method == "eer" else min_dcf
    payload = {
        "id": args.profile_id,
        "modelVersion": args.model_version,
        "preprocessingVersion": args.preprocessing_version,
        "platform": args.platform,
        "acceptThreshold": selected.threshold,
        "ambiguityMargin": args.ambiguity_margin,
        "method": args.method,
        "metrics": {
            "falseAcceptRate": selected.false_accept_rate,
            "falseRejectRate": selected.false_reject_rate,
            "equalErrorRate": (eer.false_accept_rate + eer.false_reject_rate) / 2.0,
            "minDetectionCost": min_dcf.detection_cost,
            "targetTrials": len(target_scores),
            "impostorTrials": len(impostor_scores),
        },
        "evaluationSetId": args.evaluation_set_id,
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "calibration": {
            "eerOperatingPoint": asdict(eer),
            "minDcfOperatingPoint": asdict(min_dcf),
            "falseRejectCost": args.false_reject_cost,
            "falseAcceptCost": args.false_accept_cost,
            "targetPrior": args.target_prior,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

