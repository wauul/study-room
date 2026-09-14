import React from 'react';
import { Document,Page,Text,View,StyleSheet,renderToBuffer } from '@react-pdf/renderer';
import { db } from './db';
import { summarySchema } from './summary';
const styles=StyleSheet.create({page:{padding:42,fontFamily:'Helvetica',fontSize:10,color:'#292b25',backgroundColor:'#fffdf7'},title:{fontFamily:'Times-Roman',fontSize:30,marginBottom:10},heading:{fontFamily:'Times-Roman',fontSize:18,marginTop:20,marginBottom:8,color:'#ac482d'},text:{lineHeight:1.6,marginBottom:7},foot:{position:'absolute',bottom:20,left:42,right:42,fontSize:8,color:'#777'}});
export async function personalizedPdf(roomId:string,participantId:string) {
  const room=await db.room.findUniqueOrThrow({where:{id:roomId},include:{summary:true}});
  const participant=await db.participant.findFirstOrThrow({where:{id:participantId,roomId},include:{quizResults:{include:{quizQuestion:true},orderBy:{createdAt:'asc'}}}});
  const result=summarySchema.parse(room.summary?.resultJson);
  return renderToBuffer(<Document title={`${room.name} — Study Room rundown`}><Page size="A4" style={styles.page}>
    <Text style={styles.title}>{room.name}</Text><Text style={styles.text}>SESSION RUNDOWN / Prepared for {participant.displayName}</Text>
    <Text style={styles.heading}>What clicked</Text>{result.wellUnderstood.length?result.wellUnderstood.map((x,i)=><View key={i}><Text>{x.topic}</Text><Text style={styles.text}>{x.evidence}</Text></View>):<Text style={styles.text}>Not enough evidence of mastery yet.</Text>}
    <Text style={styles.heading}>Worth another look</Text>{result.strugglePoints.map((x,i)=><View key={i}><Text>{x.topic} / {x.severity}</Text><Text style={styles.text}>{x.evidence}</Text>{x.explanation&&<Text style={styles.text}>{x.explanation}</Text>}</View>)}
    <Text style={styles.heading}>Your next study session</Text>{result.studyTips.map((t,i)=><Text key={i} style={styles.text}>{i+1}. {t}</Text>)}<Text style={styles.text}>{result.suggestedNextSteps}</Text>
    <Text style={styles.heading}>Your confidence record</Text>{participant.quizResults.length?participant.quizResults.map((r,i)=><View key={r.id}><Text style={styles.text}>{i+1}. {r.quizQuestion.questionText}</Text><Text style={styles.text}>Probabilities: {(r.submittedDistribution as number[]).join('% / ')}% — Log score: {r.zeroProbability?'-Infinity':r.score.toFixed(3)}</Text></View>):<Text style={styles.text}>No quiz submissions in this session.</Text>}
    <Text style={styles.foot} fixed render={({pageNumber,totalPages})=>`Study Room · A little clearer, together.                                            ${pageNumber} / ${totalPages}`} />
  </Page></Document>);
}
