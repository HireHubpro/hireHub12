// 1. Initialize Supabase (Using supabaseClient to avoid conflicts)
const SUPABASE_URL = 'https://pviijtxomwdpsvamqpav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2aWlqdHhvbXdkcHN2YW1xcGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTU1NzYsImV4cCI6MjA5NDU5MTU3Nn0.BXq_-rxuu6Uu5J-D4Bmf9ycTOI9IVzFNmmI_wRfcUX8';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. SIGN UP LOGIC (Runs on signup.html)
// ==========================================
const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page refresh
        
        console.log("Signup form submitted!");

        const signupBtn = document.getElementById('signup-btn');
        const fullName = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!fullName || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        signupBtn.textContent = "Creating Account...";
        signupBtn.disabled = true;

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    display_name: fullName
                }
            }
        });

        if (error) {
            console.error("Signup Error:", error.message);
            alert("Error: " + error.message);
            signupBtn.textContent = "Create Account"; 
            signupBtn.disabled = false;
        } else {
            console.log("Signup successful! Redirecting to feed...");
            window.location.href = "feed.html";
        }
    });
}

// ==========================================
// 3. LOG IN LOGIC (Runs on login.html)
// ==========================================
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page refresh
        
        console.log("Login form submitted!");

        const loginBtn = document.getElementById('login-btn');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        loginBtn.textContent = "Logging in...";
        loginBtn.disabled = true;

        // Send login request to Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Login Error:", error.message);
            alert("Invalid login credentials.");
            loginBtn.textContent = "Log In";
            loginBtn.disabled = false;
        } else {
            console.log("Login successful! Redirecting to feed...");
            window.location.href = "feed.html";
        }
    });
}