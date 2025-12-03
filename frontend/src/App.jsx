import { Routes, Route } from "react-router-dom";
import Signup from "./auth/Signup";
import Signin from "./auth/Signin";
import VerifyOtp from "./auth/VarifyOTP";
import Updatepass from "./auth/Updatepass";
import Logout from "./auth/Logout";
import Home from "./pages/Home"
import CreateChannel from "./components/Createchannel"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Signin />} />
      <Route path="/login" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verifyotp" element={<VerifyOtp />} />
      <Route path="/updatepass" element={<Updatepass />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/home" element={<Home />} />
      <Route path="/createchannel" element={<CreateChannel/>}/>

    </Routes>
  );
}
