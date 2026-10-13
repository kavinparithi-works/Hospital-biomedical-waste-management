from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from models import db, User, Department, WasteCategory, WasteEntry, Violation
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
import os
import random
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-key-for-development'
# Use SQLite for development, can be easily changed to MySQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hospital_waste.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Routes ---

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and bcrypt.check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Login Unsuccessful. Please check email and password', 'danger')
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    if current_user.role == 'admin':
        # Fetch data for admin dashboard
        total_entries = WasteEntry.query.count()
        total_weight = db.session.query(db.func.sum(WasteEntry.weight)).scalar() or 0
        compliance_percentage = 94.5 
        pending_disposal = WasteEntry.query.filter_by(status='pending').count()
        
        categories = WasteCategory.query.all()
        category_labels = [c.color_code for c in categories]
        category_data = [random.randint(10, 50) for _ in categories]
        
        # Recent activities (last 5)
        recent_entries = WasteEntry.query.order_by(WasteEntry.timestamp.desc()).limit(5).all()
        
        return render_template('admin_dashboard.html', 
                               total_weight=round(total_weight, 2),
                               total_entries=total_entries,
                               compliance_percentage=compliance_percentage,
                               pending_disposal=pending_disposal,
                               category_labels=category_labels,
                               category_data=category_data,
                               recent_entries=recent_entries)
                               
    elif current_user.role == 'staff':
        # Fetch data for staff dashboard
        categories = WasteCategory.query.all()
        departments = Department.query.all()
        today_entries = WasteEntry.query.filter(
            WasteEntry.user_id == current_user.id,
            db.func.date(WasteEntry.timestamp) == datetime.utcnow().date()
        ).order_by(WasteEntry.timestamp.desc()).all()
        
        return render_template('staff_dashboard.html', categories=categories, departments=departments, today_entries=today_entries)
        
    elif current_user.role == 'driver':
        # Fetch pending tasks for worker
        pending_tasks = WasteEntry.query.filter_by(status='pending').all()
        completed_tasks = WasteEntry.query.filter(WasteEntry.status.in_(['collected', 'transported', 'disposed'])).count()
        today_assigned = len(pending_tasks) + completed_tasks
        compliance_score = 98.2 # mock
        
        return render_template('worker_dashboard.html', 
                               pending_tasks=pending_tasks,
                               today_assigned=today_assigned,
                               completed_tasks=completed_tasks,
                               compliance_score=compliance_score)
    else:
        return "Role not recognized", 403

@app.route('/waste_entry', methods=['GET', 'POST'])
@login_required
def waste_entry():
    if request.method == 'POST':
        weight = request.form.get('weight')
        category_id = request.form.get('category_id')
        dept_id = request.form.get('dept_id')
        
        if not dept_id:
             dept_id = current_user.department_id if current_user.department_id else 1
             
        import uuid
        qr_code_id = str(uuid.uuid4())[:12]
        
        entry = WasteEntry(
            user_id=current_user.id,
            dept_id=dept_id,
            category_id=category_id,
            weight=float(weight),
            qr_code_id=qr_code_id,
            status='pending'
        )
        db.session.add(entry)
        db.session.commit()
        flash('Waste entry logged successfully with QR Code: ' + qr_code_id, 'success')
        return redirect(url_for('dashboard'))
        
    return redirect(url_for('dashboard')) # Staff enters waste on their dashboard now

# --- API Endpoints ---
@app.route('/api/predict', methods=['POST'])
def predict_waste():
    data = request.json
    item_name = data.get('item_name', '').lower()
    
    # Simple rule-based logic for the mock
    if 'syringe' in item_name or 'sharp' in item_name or 'needle' in item_name:
        return jsonify({'category': 'White', 'category_id': 3, 'confidence': 98, 'disposal': 'Autoclaving and Shredding'})
    elif 'plastic' in item_name or 'tubing' in item_name or 'glove' in item_name:
        return jsonify({'category': 'Red', 'category_id': 2, 'confidence': 95, 'disposal': 'Autoclaving and Recycling'})
    elif 'glass' in item_name or 'implant' in item_name:
        return jsonify({'category': 'Blue', 'category_id': 4, 'confidence': 92, 'disposal': 'Disinfection and Recycling'})
    else:
        return jsonify({'category': 'Yellow', 'category_id': 1, 'confidence': 90, 'disposal': 'Incineration or Deep Burial'})

@app.route('/api/update_status/<int:entry_id>', methods=['POST'])
@login_required
def update_status(entry_id):
    if current_user.role != 'driver':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    new_status = data.get('status')
    
    if new_status not in ['pending', 'collected', 'transported', 'disposed']:
        return jsonify({'error': 'Invalid status'}), 400
        
    entry = WasteEntry.query.get_or_404(entry_id)
    entry.status = new_status
    db.session.commit()
    
    return jsonify({'success': True, 'new_status': new_status})

def setup_mock_data():
    with app.app_context():
        db.create_all()
        # Create departments
        if not Department.query.first():
            depts = [
                Department(name='General Admin'),
                Department(name='ICU'),
                Department(name='Laboratory'),
                Department(name='OT'),
                Department(name='Emergency')
            ]
            db.session.bulk_save_objects(depts)
            db.session.commit()
            
            # Create categories
            categories = [
                WasteCategory(color_code='Yellow', description='Anatomical Waste, Soiled Waste'),
                WasteCategory(color_code='Red', description='Contaminated Plastics, Syringes'),
                WasteCategory(color_code='White', description='Sharps, Needles'),
                WasteCategory(color_code='Blue', description='Broken Glassware, Metallic Body Implants')
            ]
            db.session.bulk_save_objects(categories)
            db.session.commit()
        
        # Create users if they don't exist
        if not User.query.filter_by(email='admin@hospital.com').first():
            hashed_pw = bcrypt.generate_password_hash('password').decode('utf-8')
            
            admin = User(name='Admin User', email='admin@hospital.com', password_hash=hashed_pw, role='admin', department_id=1)
            staff = User(name='Nurse Sarah', email='staff@hospital.com', password_hash=hashed_pw, role='staff', department_id=2)
            worker = User(name='Driver John', email='worker@hospital.com', password_hash=hashed_pw, role='driver', department_id=1)
            
            db.session.add_all([admin, staff, worker])
            db.session.commit()
            
            # Add mock waste entries
            entries = [
                WasteEntry(user_id=staff.id, dept_id=2, category_id=1, weight=5.2, qr_code_id='MOCK-QR-1', status='pending'),
                WasteEntry(user_id=staff.id, dept_id=3, category_id=3, weight=2.1, qr_code_id='MOCK-QR-2', status='collected'),
                WasteEntry(user_id=staff.id, dept_id=4, category_id=2, weight=4.0, qr_code_id='MOCK-QR-3', status='pending')
            ]
            db.session.add_all(entries)
            db.session.commit()

if __name__ == '__main__':
    if not os.path.exists('hospital_waste.db'):
        setup_mock_data()
    app.run(debug=True, port=5000)
