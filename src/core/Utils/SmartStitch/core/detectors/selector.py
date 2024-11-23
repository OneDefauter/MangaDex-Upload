from src.core.Utils.SmartStitch.core.utils.constants import DETECTION_TYPE

from src.core.Utils.SmartStitch.core.services.global_logger import logFunc
from src.core.Utils.SmartStitch.core.detectors.direct_slicing import DirectSlicingDetector
from src.core.Utils.SmartStitch.core.detectors.pixel_comparison import PixelComparisonDetector


@logFunc()
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
