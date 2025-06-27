import { supabase } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- REGISTRATION FORM LOGIC ---
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        const fullNameInput = document.getElementById('full-name');
        const ageInput = document.getElementById('age');
        const primaryPhoneInput = document.getElementById('primary-phone');
        const secondaryPhoneInput = document.getElementById('secondary-phone');

        const fullNameError = document.getElementById('full-name-error');
        const ageError = document.getElementById('age-error');
        const phoneError = document.getElementById('phone-error');

        const phoneRegex = /^09\d{9}$/;

        const validators = {
            fullName: () => {
                const isValid = fullNameInput.value.trim() !== '';
                updateValidationUI(fullNameInput, fullNameError, isValid, 'وارد کردن نام و نام خانوادگی الزامی است.');
                return isValid;
            },
            age: () => {
                const age = parseInt(ageInput.value, 10);
                const isRequired = ageInput.value !== '';
                if (!isRequired) {
                    updateValidationUI(ageInput, ageError, false, 'وارد کردن سن الزامی است.');
                    return false;
                }
                const isInRange = age >= 7 && age <= 13;
                updateValidationUI(ageInput, ageError, isInRange, 'سن فرزند شما باید بین ۷ تا ۱۳ سال باشد.');
                return isInRange;
            },
            phones: () => {
                const primary = primaryPhoneInput.value.trim();
                const secondary = secondaryPhoneInput.value.trim();
                
                // Reset individual phone styles first
                primaryPhoneInput.classList.remove('invalid-input');
                secondaryPhoneInput.classList.remove('invalid-input');

                // 1. At least one phone is required
                const atLeastOnePhone = primary || secondary;
                if (!atLeastOnePhone) {
                    updateValidationUI(primaryPhoneInput, phoneError, false, 'وارد کردن حداقل یک شماره تلفن الزامی است.');
                    primaryPhoneInput.classList.add('invalid-input'); // Highlight primary if none are entered
                    return false;
                }
                
                // 2. Validate format of each phone if it exists
                if (primary && !phoneRegex.test(primary)) {
                    updateValidationUI(primaryPhoneInput, phoneError, false, 'شماره تلفن اصلی معتبر نیست (مثال: 09123456789).');
                    return false;
                }
                if (secondary && !phoneRegex.test(secondary)) {
                    updateValidationUI(secondaryPhoneInput, phoneError, false, 'شماره تلفن دوم معتبر نیست (مثال: 09123456789).');
                     return false;
                }
                
                // If all checks pass
                updateValidationUI(primaryPhoneInput, phoneError, true); // This will clear the error message
                return true;
            }
        };
        
        // Live validation listeners
        fullNameInput.addEventListener('input', validators.fullName);
        ageInput.addEventListener('input', validators.age);
        primaryPhoneInput.addEventListener('input', validators.phones);
        secondaryPhoneInput.addEventListener('input', validators.phones);

        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearGeneralMessage(registrationForm);

            // Run all validations on submit
            const areFieldsValid = Object.values(validators).every(validator => validator());
            const consentCheckbox = document.getElementById('rules-consent');
            const isConsentChecked = consentCheckbox.checked;
            
            // Overall form validity check
            if (!areFieldsValid || !isConsentChecked) {
                if (!areFieldsValid) {
                    const firstError = registrationForm.querySelector('.invalid-input');
                    if (firstError) {
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                if (!isConsentChecked) {
                    showGeneralMessage(registrationForm, 'لطفاً قبل از ثبت‌نام، قوانین را مطالعه و تایید کنید.', 'error');
                }
                return;
            }

            const submitButton = registrationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'در حال ارسال...';
            
            // --- Duplicate Check ---
            const { data: existingChild, error: selectError } = await supabase
                .from('children')
                .select('id')
                .eq('full_name', fullNameInput.value.trim())
                .eq('primary_parent_phone', primaryPhoneInput.value.trim())
                .limit(1);

            if (selectError) {
                showGeneralMessage(registrationForm, 'خطا در بررسی اطلاعات. لطفا دوباره تلاش کنید.', 'error');
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                return;
            }
            if (existingChild && existingChild.length > 0) {
                showGeneralMessage(registrationForm, 'فرزندی با این نام و شماره تلفن اصلی قبلا ثبت‌نام شده است.', 'error');
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                return;
            }

            const formData = {
                full_name: fullNameInput.value.trim(),
                age: parseInt(ageInput.value, 10),
                primary_parent_phone: primaryPhoneInput.value.trim(),
                secondary_parent_phone: secondaryPhoneInput.value.trim() || null,
                medical_history: document.getElementById('medical_history').value.trim() || null,
                can_leave_unaccompanied: false,
            };

            const { error: insertError } = await supabase
                .from('children')
                .insert([formData]);

            if (insertError) {
                console.error('Error inserting data:', insertError);
                if (insertError.message.includes('unique constraint')) {
                     showGeneralMessage(registrationForm, 'این شماره تلفن قبلا به عنوان شماره اصلی برای فرد دیگری ثبت شده است.', 'error');
                } else {
                     showGeneralMessage(registrationForm, 'خطا در ثبت اطلاعات. لطفا دوباره تلاش کنید.', 'error');
                }
            } else {
                showGeneralMessage(registrationForm, 'ثبت نام فرزند شما با موفقیت انجام شد. صفحه تا لحظاتی دیگر مجددا بارگذاری می‌شود.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
            
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        });
    }

    // --- PARENT LOGIN FORM LOGIC ---
    const parentLoginForm = document.getElementById('parent-login-form');
    if (parentLoginForm) {
        parentLoginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const submitButton = parentLoginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'در حال بررسی...';

            const phone = document.getElementById('login-phone').value.trim();

            const { data, error } = await supabase
                .from('children')
                .select('id')
                .eq('primary_parent_phone', phone)
                .limit(1); 
            
            if (error) {
                console.error("Parent login error:", error);
                showGeneralMessage(parentLoginForm, 'خطا در ارتباط با سرور. لطفا دوباره تلاش کنید.', 'error');
            } else if (data && data.length > 0) {
                localStorage.setItem('userPhone', phone);
                window.location.replace('panel.html');
            } else {
                showGeneralMessage(parentLoginForm, 'شماره تلفنی با این مشخصات ثبت نشده است.', 'error');
            }
            
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        });
    }

    // --- UTILITY FUNCTIONS ---

    function updateValidationUI(inputElement, errorElement, isValid, errorMessage) {
        if (isValid) {
            inputElement.classList.remove('invalid-input');
            errorElement.textContent = '';
        } else {
            inputElement.classList.add('invalid-input');
            errorElement.textContent = errorMessage;
        }
    }
    
    function showGeneralMessage(form, message, type) {
        let messageDiv = form.querySelector('.form-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.className = 'form-message';
            form.prepend(messageDiv);
        }

        messageDiv.textContent = message;
        messageDiv.style.padding = '10px';
        messageDiv.style.marginBottom = '15px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.color = 'white';
        messageDiv.style.textAlign = 'center';
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = '#198754';
        } else if (type === 'error') {
            messageDiv.style.backgroundColor = '#dc3545';
        } else {
            messageDiv.style.backgroundColor = '#0d6efd';
        }
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function clearGeneralMessage(form) {
        const messageDiv = form.querySelector('.form-message');
        if (messageDiv) {
            messageDiv.remove();
        }
    }
});
 