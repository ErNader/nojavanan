import { supabase } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const userPhone = localStorage.getItem('userPhone');
    const userPhoneElement = document.getElementById('user-phone');
    const ceremonyTimeElement = document.getElementById('ceremony-time');
    const logoutButton = document.getElementById('logout-button');

    // Redirect to login if phone number is not found
    if (!userPhone) {
        window.location.replace('index.html');
        return;
    }

    // Display masked phone number
    if (userPhoneElement) {
        // Mask the phone number: 09*********
        const maskedPhone = userPhone.substring(0, 2) + '*********';
        userPhoneElement.textContent = maskedPhone;
        // Apply right-to-left styling
        userPhoneElement.style.direction = 'ltr';
        userPhoneElement.style.textAlign = 'right';
    }

    // Fetch ceremony end time
    async function fetchCeremonyTime() {
        if (!ceremonyTimeElement) return;

        const { data, error } = await supabase
            .from('ceremony')
            .select('end_time')
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching ceremony time:', error);
            ceremonyTimeElement.textContent = 'نامشخص';
            ceremonyTimeElement.style.color = '#dc3545';
        } else if (data && data.end_time) {
            ceremonyTimeElement.textContent = data.end_time;
        } else {
            ceremonyTimeElement.textContent = 'هنوز اعلام نشده';
        }
    }

    // Handle logout
    if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('userPhone');
            window.location.replace('index.html');
        });
    }

    // Initial load
    fetchCeremonyTime();
}); 