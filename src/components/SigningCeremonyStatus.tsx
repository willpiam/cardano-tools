import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Check, Clock, Users } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  hasSigned: boolean;
}

interface SigningCeremonyStatusProps {
  requiredSignatures: number;
  participants: Participant[];
  progress: number;
}

const SigningCeremonyStatus = ({
  requiredSignatures,
  participants,
  progress,
}: SigningCeremonyStatusProps) => {
  const signedCount = participants.filter((p) => p.hasSigned).length;

  return (
    <Card className="border-primary/20 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Users className="h-5 w-5 mr-2 text-primary" />
          Signing Ceremony Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Signatures: {signedCount} of {requiredSignatures} required
            </span>
            <Badge
              // variant={
              //   signedCount >= requiredSignatures ? 'default' : 'secondary'
              // }
              className={
                signedCount >= requiredSignatures
                  ? 'bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30'
                  : 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 border border-yellow-600/30'
              }
            >
              {signedCount >= requiredSignatures ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Clock className="h-3 w-3 mr-1" />
              )}
              {signedCount >= requiredSignatures
                ? 'Signatures Complete'
                : 'Awaiting Signatures'}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium mb-2">Ceremony Participants</div>
          <div className="grid grid-cols-1 gap-3">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 rounded-md ${
                  participant.hasSigned
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}
              >
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage
                      src={participant.avatar}
                      alt={participant.name}
                    />
                    <AvatarFallback>
                      {participant.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{participant.name}</span>
                </div>
                <Badge
                  // variant={participant.hasSigned ? 'default' : 'secondary'}
                  className={
                    participant.hasSigned
                      ? 'bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30'
                      : 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 border border-yellow-600/30'
                  }
                >
                  {participant.hasSigned ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Signed
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SigningCeremonyStatus;
