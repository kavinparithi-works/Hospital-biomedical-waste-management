from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='staff') # admin, staff, driver
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)

class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    users = db.relationship('User', backref='department', lazy=True)

class WasteCategory(db.Model):
    __tablename__ = 'waste_categories'
    id = db.Column(db.Integer, primary_key=True)
    color_code = db.Column(db.String(50), nullable=False) # Red, Yellow, Blue, White
    description = db.Column(db.String(255), nullable=False)

class WasteEntry(db.Model):
    __tablename__ = 'waste_entry'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('waste_categories.id'), nullable=False)
    weight = db.Column(db.Float, nullable=False) # in kg
    qr_code_id = db.Column(db.String(100), unique=True, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='pending') # pending, collected, transported, disposed

class Violation(db.Model):
    __tablename__ = 'violations'
    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey('waste_entry.id'), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    penalty_score = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
