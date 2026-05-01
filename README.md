# Ethara AI | Modern Project Management 🚀

Ethara AI is a premium, full-stack project management application designed for speed and simplicity. It features a stunning glassmorphism interface, robust task tracking, and secure multi-user authentication.

![Ethara AI Preview](https://via.placeholder.com/800x450?text=Ethara+AI+Dashboard+Preview)

## ✨ Features
- **Premium Glassmorphism UI**: A modern, translucent design system with smooth micro-animations.
- **Secure Authentication**: JWT-based login and signup with secure PBKDF2 password hashing.
- **Project & Task Management**: Create, view, and delete projects and tasks with ease.
- **Dashboard Statistics**: Real-time tracking of Total, In-Progress, and Completed tasks.
- **Responsive Design**: Works beautifully on desktops and tablets.
- **Cloud Ready**: Built-in support for PostgreSQL and easy deployment to Railway or Render.

## 🛠️ Tech Stack
- **Backend**: Python, FastAPI, SQLModel (SQLAlchemy)
- **Database**: PostgreSQL (Production), SQLite (Local Development)
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Modern Glassmorphism)
- **Icons**: Lucide Icons
- **Security**: JWT (JSON Web Tokens), Passlib

## 🚀 Getting Started

### Local Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ethara-ai.git
   cd ethara-ai
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**:
   ```bash
   uvicorn server.main:app --reload
   ```

4. **Open the app**:
   Navigate to `http://localhost:8000` in your browser.

## 🌍 Deployment
This project is optimized for **Railway** or **Render**.
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn server.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**: Add `DATABASE_URL` for PostgreSQL support.

---
Built with ❤️ by [Your Name]
