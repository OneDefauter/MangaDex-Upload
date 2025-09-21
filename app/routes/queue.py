from flask import Blueprint, render_template

queue_bp = Blueprint('queue', __name__)

@queue_bp.route('/queue')
def queue():
    return render_template('queue.html')
