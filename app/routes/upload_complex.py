from flask import Blueprint, render_template

upload_complex_bp = Blueprint('upload_complex', __name__)

@upload_complex_bp.route('/upload/complex')
def upload():
    return render_template('upload_complex.html')
