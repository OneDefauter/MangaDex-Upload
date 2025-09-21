from app.src.utils.SmartStitch.core.utils.constants import DETECTION_TYPE

from app.src.utils.SmartStitch.core.detectors.direct_slicing import DirectSlicingDetector
from app.src.utils.SmartStitch.core.detectors.pixel_comparison import PixelComparisonDetector


def select_detector(detection_type: str | DETECTION_TYPE):
    if detection_type == "none" or detection_type == DETECTION_TYPE.NO_DETECTION.value:
        return DirectSlicingDetector()
    elif (
        detection_type == "pixel"
        or detection_type == DETECTION_TYPE.PIXEL_COMPARISON.value
    ):
        return PixelComparisonDetector()
    else:
        raise Exception("Invalid Detection Type")
