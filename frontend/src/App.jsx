import { Routes, Route } from "react-router-dom";
import Signup from "./auth/Signup";
import Signin from "./auth/Signin";
import VerifyOtp from "./auth/VarifyOTP";
import Updatepass from "./auth/Updatepass";
import Logout from "./auth/Logout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Signin />} />
      <Route path="/login" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verifyotp" element={<VerifyOtp />} />
      <Route path="/updatepass" element={<Updatepass />} />
      <Route path="/logout" element={<Logout />} />
    </Routes>
  );
}
