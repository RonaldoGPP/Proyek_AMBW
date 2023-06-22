from flask import *
from flask_bootstrap import Bootstrap

import os
from flask_pymongo import PyMongo
from bson import ObjectId
from werkzeug.utils import secure_filename
from passlib.hash import bcrypt

app = Flask(__name__)
Bootstrap(app)
app.config["SECRET_KEY"] = "rahasia"
app.config["UPLOAD_FOLDER"] = "static/uploads/"
app.config["MONGO_DBNAME"] = "gallery"
app.config["MONGO_URI"] = "mongodb://localhost:27017/gallery"

mongo = PyMongo(app)
ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif"]
users_collection = mongo.db.users
img_collection = mongo.db.gallery
@app.route("/")
def register():
    return render_template("register.html")
@app.route("/index")
def index():
    return render_template("index.html")
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Check if the username already exists
        if users_collection.find_one({"username": username}):
            return "Username already exists. Please choose a different username."

        # Hash the password
        hashed_password = bcrypt.hash(password)

        # Create a new user document
        user = {
            "username": username,
            "password": hashed_password
        }

        # Insert the user document into the collection
        users_collection.insert_one(user)
        return render_template("register.html")

    return render_template('register.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']

    # Retrieve the user document by username
    user = users_collection.find_one({"username": username})

    # Check if the user exists
    if user:
        # Verify the password
        if bcrypt.verify(password, user['password']):
            session['username'] = username
            return render_template("index.html", session = session)
        else:
            return "Incorrect password."
    else:
        return "User not found."

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect('/')

@app.route("/gallery/")
def gallery():
    username = session.get("username")
    if username:
        user_gallery = img_collection.find({"username": username})
        return render_template("gallery.html", gallery=user_gallery)
    else:
        return redirect(url_for("login"))


@app.route("/upload/", methods=["GET", "POST"])
def upload():
    if request.method == "POST":
        image = request.files["image"]
        description = request.form.get("description")
        if image and description and image.filename.split(".")[-1].lower() in ALLOWED_EXTENSIONS:
            filename = secure_filename(image.filename)
            image.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))

            mongo.db.gallery.insert_one({
                "filename": filename,
                "description": description.strip(),
                "username": session.get("username")
            })

            flash("Successfully uploaded image to gallery!", "success")
            return redirect(url_for("upload"))
        else:
            flash("An error occurred while uploading the image!", "danger")
            return redirect(url_for("upload"))
    return render_template("upload.html")

@app.route("/delete/<image_id>", methods=["POST"])
def delete(image_id):
    username = session.get("username")
    if username:
        image = img_collection.find_one({"_id": ObjectId(image_id), "username": username})
        if image:
            filename = image["filename"]
            # Remove the image file from the file system
            os.remove(os.path.join(app.config["UPLOAD_FOLDER"], filename))
            # Delete the image document from the collection
            img_collection.delete_one({"_id": ObjectId(image_id)})
            flash("Successfully deleted image from gallery!", "success")
        else:
            flash("Image not found or you do not have permission to delete it.", "danger")
    else:
        flash("You need to be logged in to delete images.", "danger")
    return redirect(url_for("gallery"))
# @app.route('/manifest.json')
# def manifest():
#     return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/service-worker.js')
def sw():
    return app.send_static_file('service-worker.js')


if __name__ == "__main__":
    app.run(debug=True)