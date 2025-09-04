import { PosHeader } from "@/components/table/PosTable/PosHeader";

export default function BranchLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {



    return (
        <div>
            <div className=" mx-auto p-6 space-y-3  overflow-y-auto">
                <PosHeader />
            </div>
            {children}
        </div>
    );
}
