import SummaryClient from '@/components/SummaryClient';
export default async function SummaryPage({params}:{params:Promise<{id:string}>}){return <SummaryClient id={(await params).id}/>;}
