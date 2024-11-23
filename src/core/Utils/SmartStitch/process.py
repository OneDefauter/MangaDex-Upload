import gc
from time import time

from src.core.Utils.SmartStitch.core.services.directory_explorer import DirectoryExplorer
from src.core.Utils.SmartStitch.core.services.image_handler import ImageHandler
from src.core.Utils.SmartStitch.core.services.image_manipulator import ImageManipulator
from src.core.Utils.SmartStitch.core.detectors.pixel_comparison import PixelComparisonDetector

class ConsoleStitchProcess:
    # @logFunc(inclass=True)
    def run(self, kwargs: dict[str:any]):
        # Initialize Services
        explorer = DirectoryExplorer()
        img_handler = ImageHandler()
        img_manipulator = ImageManipulator()
        detector = PixelComparisonDetector()
        width_enforce_mode = 1

        # Starting Stitch Process
        start_time = time()
        print('--- Process Starting Up ---')
        print('Exploring input directory for working directories')
        input_dirs = explorer.run(input=kwargs.get("input_folder"), output=kwargs.get("output_folder"))
        input_dirs_count = len(input_dirs)
        print('[{count}] Working directories were found'.format(count=input_dirs_count))
        dir_iteration = 1
        for dir in input_dirs:
            print(
                '-> Starting stitching process for working directory #{iteration} <-'.format(
                    iteration=dir_iteration
                )
            )
            print(
                '[{iteration}/{count}] Preparing & loading images Into memory'.format(
                    iteration=dir_iteration, count=input_dirs_count
                )
            )
            imgs = img_handler.load(dir)
            imgs = img_manipulator.resize(
                imgs, width_enforce_mode, kwargs.get('custom_width')
            )
            print(
                '[{iteration}/{count}] Combining images into a single combined image'.format(
                    iteration=dir_iteration, count=input_dirs_count
                )
            )
            combined_img = img_manipulator.combine(imgs)
            print(
                '[{iteration}/{count}] Detecting & selecting valid slicing points'.format(
                    iteration=dir_iteration, count=input_dirs_count
                )
            )
            slice_points = detector.run(
                combined_img,
                kwargs.get("split_height"),
                sensitivity=kwargs.get("detection_senstivity"),
                ignorable_pixels=kwargs.get("ignorable_pixels"),
                scan_step=kwargs.get("scan_line_step"),
            )
            print(
                '[{iteration}/{count}] Generating sliced output images in memory'.format(
                    iteration=dir_iteration, count=input_dirs_count
                )
            )
            imgs = img_manipulator.slice(combined_img, slice_points)
            print(
                '[{iteration}/{count}] Saving output images to storage'.format(
                    iteration=dir_iteration, count=input_dirs_count
                )
            )
            img_iteration = 1
            for img in imgs:
                img_file_name = img_handler.save(
                    dir,
                    img,
                    img_iteration,
                    img_format=kwargs.get("output_type"),
                    quality=kwargs.get('lossy_quality'),
                )
                img_iteration += 1
                print(
                    '[{iteration}/{count}] {file} has been successfully saved'.format(
                        iteration=dir_iteration,
                        count=input_dirs_count,
                        file=img_file_name,
                    )
                )
            dir_iteration += 1
            gc.collect()
        end_time = time()
        print(
            '--- Process completed in {time:.3f} seconds ---'.format(
                time=end_time - start_time
            )
        )
