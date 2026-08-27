
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

const API_URL = import.meta.env.VITE_API_URL

const Dashboard = () => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("worknestToken")}`,
        },
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || "Unable to logout.")
        return
      }
      localStorage.removeItem("worknestToken")
      toast.success(data.message)
      navigate("/")
    } catch {
      localStorage.removeItem("worknestToken")
      toast.success("Logout successful")
      navigate("/")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E7F6F2]">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-[#2C3333]">Dashboard</h1>
        <button type="button" onClick={handleLogout} className="mt-6 cursor-pointer rounded-full bg-[#395B64] px-7 py-3 font-semibold text-white transition hover:bg-[#2C3333]">
          Logout
        </button>
      </div>
    </div>
  )
}

export default Dashboard