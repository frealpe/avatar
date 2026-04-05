import { AppContent, AppSidebar, AppHeader } from '../components/index'

const DefaultLayout = () => {
    return (
        <div className="flex h-screen bg-[#000000] overflow-hidden text-[#f8f9fe]">
            {/* HUD Sidebar (Fixed width) */}
            <AppSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden wrapper">
                <AppHeader />
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <AppContent />
                </div>
            </div>
        </div>
    )
}

export default DefaultLayout
