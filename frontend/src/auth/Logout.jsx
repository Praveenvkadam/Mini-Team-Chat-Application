import { signOut } from "firebase/auth";


export default function Logout() {
  return <button onClick={() => signOut(auth)}>Logout</button>;
}
