import { Outlet } from "react-router-dom";
import "@/assets/css/App.css";

function App() {
  return (
    <div className="h-screen w-screen">
      <Outlet />
    </div>
  );
}

export default App;
