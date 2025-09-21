from flask import Blueprint, request, jsonify, render_template

main_bp = Blueprint('main', __name__)

@main_bp.route("/")
def main():
    return render_template("main.html")