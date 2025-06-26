document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message');

    // Clear any previous session to ensure a clean login
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminName');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = passwordInput.value;
            let role = null;
            let name = '';

            // Static passwords mapped to roles
            if (password === 'admin1') {
                role = 'admin1';
                name = 'مدیر کل';
            } else if (password === 'admin2') {
                role = 'admin2';
                name = 'مدیر جوایز';
            } else if (password === 'admin3') {
                role = 'admin3';
                name = 'مشاهده‌گر';
            }

            if (role) {
                // Store role and name in localStorage for the admin session
                localStorage.setItem('adminRole', role);
                localStorage.setItem('adminName', name);
                window.location.replace('admin.html');
            } else {
                // Display an error message if the password is incorrect
                if (messageDiv) {
                    messageDiv.textContent = 'رمز عبور نامعتبر است.';
                    messageDiv.style.display = 'block';
                    messageDiv.className = 'error'; 
                } else {
                    alert('رمز عبور نامعتبر است.');
                }
            }
        });
    }
}); 