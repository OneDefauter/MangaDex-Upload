from flask import Blueprint, send_from_directory, request
import os

favicon_bp = Blueprint('favicon', __name__)

@favicon_bp.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(request.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )
