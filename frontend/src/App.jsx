import { Routes, Route } from "react-router-dom";
import Signup from "./auth/Signup";
import Signin from "./auth/Signin";
import Updatepass from "./auth/Updatepass";
import Logout from "./auth/Logout";
import Home from "./pages/Home"
import CreateChannel from "./components/Createchannel"
import UpdateProfile from "./components/UpdateProfile";
import Request from "./components/Request";



export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Signin />} />
      <Route path="/login" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/updatepass" element={<Updatepass />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/home" element={<Home />} />
      <Route path="/createchannel" element={<CreateChannel/>}/>
      <Route path="/updateprofile" element={<UpdateProfile/>}/>
      <Route path="/request" element={<Request/>}/>
    </Routes>
  );
}
