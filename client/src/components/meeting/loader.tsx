import { Loader2 } from "lucide-react";

const Loader = () => {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                        Loading meeting...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Loader;
