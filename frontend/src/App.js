import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Tools from "./pages/Tools";
import MedicationReminder from "./pages/MedicationReminder";

function App(){

  return(

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/chat" element={<Chat />} />

        <Route path="/tools" element={<Tools />} />

        <Route path="/reminder" element={<MedicationReminder />} />

        <Route path="/reminders" element={<MedicationReminder />} />

      </Routes>

    </BrowserRouter>
  )
}

export default App;